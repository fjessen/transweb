#!/usr/bin/env node
/* eslint-env node */
/**
 * Transweb — generates the Mozambican Portuguese locale (pt-mz) from pt-br.
 *
 * Fleetbase only ships pt-br. Mozambique follows European Portuguese usage, so we derive pt-mz by
 * applying vocabulary substitutions (utilizador, ecrã, telemóvel, palavra-passe, definições, ...)
 * and the "a + infinitive" progressive (A carregar...) to every pt-br.yaml we can find:
 *
 *   node scripts/transweb/make-pt-mz.js translations/pt-br.yaml translations/pt-mz.yaml
 *   node scripts/transweb/make-pt-mz.js --node-modules node_modules   # every @fleetbase/* and *-engine
 *
 * The second form runs in the Docker build (after `pnpm install`) so extension engines get a pt-mz
 * file too; otherwise ember-intl would fall back to English for every engine string.
 * Hand-written overrides in translations/pt-mz.overrides.yaml win over generated values; they are
 * applied by key path (dotted) with a minimal line-based YAML reader, so keep that file simple.
 */
'use strict';

const fs = require('fs');
const path = require('path');

// [pt-BR, pt-MZ]. Order matters: longer phrases first. Matching is whole-word and case-aware
// (lower, Capitalised and UPPER variants are generated automatically).
const TERMS = [
    // progressive (estou fazendo -> estou a fazer)
    ['carregando', 'a carregar'],
    ['salvando', 'a guardar'],
    ['enviando', 'a enviar'],
    ['processando', 'a processar'],
    ['buscando', 'a procurar'],
    ['procurando', 'a procurar'],
    ['atualizando', 'a actualizar'],
    ['excluindo', 'a eliminar'],
    ['removendo', 'a remover'],
    ['criando', 'a criar'],
    ['conectando', 'a ligar'],
    ['verificando', 'a verificar'],
    ['gerando', 'a gerar'],
    ['importando', 'a importar'],
    ['exportando', 'a exportar'],
    ['sincronizando', 'a sincronizar'],
    ['aguardando', 'a aguardar'],
    ['iniciando', 'a iniciar'],
    ['redirecionando', 'a redireccionar'],
    ['rastreando', 'a seguir'],
    ['digitando', 'a escrever'],
    // vocabulary
    ['nome de usuário', 'nome de utilizador'],
    ['usuários', 'utilizadores'],
    ['usuário', 'utilizador'],
    ['usuárias', 'utilizadoras'],
    ['usuária', 'utilizadora'],
    ['senhas', 'palavras-passe'],
    ['senha', 'palavra-passe'],
    ['telas', 'ecrãs'],
    ['tela', 'ecrã'],
    ['celulares', 'telemóveis'],
    ['celular', 'telemóvel'],
    ['contatos', 'contactos'],
    ['contato', 'contacto'],
    ['equipes', 'equipas'],
    ['equipe', 'equipa'],
    ['arquivos', 'ficheiros'],
    ['arquivo', 'ficheiro'],
    ['salvar', 'guardar'],
    ['salvo', 'guardado'],
    ['salva', 'guardada'],
    ['salvos', 'guardados'],
    ['salvas', 'guardadas'],
    ['excluir', 'eliminar'],
    ['excluído', 'eliminado'],
    ['excluída', 'eliminada'],
    ['excluídos', 'eliminados'],
    ['excluídas', 'eliminadas'],
    ['exclusão', 'eliminação'],
    ['configurações', 'definições'],
    ['gerenciamento', 'gestão'],
    ['gerenciar', 'gerir'],
    ['gerenciado', 'gerido'],
    ['gerenciada', 'gerida'],
    ['gerenciador', 'gestor'],
    ['gerente', 'gestor'],
    ['cadastros', 'registos'],
    ['cadastro', 'registo'],
    ['cadastrar', 'registar'],
    ['cadastrado', 'registado'],
    ['cadastrada', 'registada'],
    ['registros', 'registos'],
    ['registro', 'registo'],
    ['registrar', 'registar'],
    ['registrado', 'registado'],
    ['registrada', 'registada'],
    ['aplicativos', 'aplicações'],
    ['aplicativo', 'aplicação'],
    ['ônibus', 'autocarro'],
    ['caminhões', 'camiões'],
    ['caminhão', 'camião'],
    ['trens', 'comboios'],
    ['trem', 'comboio'],
    ['planilhas', 'folhas de cálculo'],
    ['planilha', 'folha de cálculo'],
    ['rastreamento', 'rastreio'],
    ['CEP', 'código postal'],
    ['baixar', 'transferir'],
    ['tchau', 'adeus'],
    ['ótimo', 'óptimo'],
    ['atualizar', 'actualizar'],
    ['atualizado', 'actualizado'],
    ['atualizada', 'actualizada'],
    ['atualização', 'actualização'],
    ['atualizações', 'actualizações'],
    ['ação', 'acção'],
    ['ações', 'acções'],
    ['ativo', 'activo'],
    ['ativa', 'activa'],
    ['ativos', 'activos'],
    ['ativas', 'activas'],
    ['ativar', 'activar'],
    ['desativar', 'desactivar'],
    ['ativado', 'activado'],
    ['desativado', 'desactivado'],
    ['fatura', 'factura'],
    ['faturas', 'facturas'],
    ['faturamento', 'facturação'],
    ['direção', 'direcção'],
    ['seção', 'secção'],
    ['seções', 'secções'],
    ['coletar', 'recolher'],
    ['coleta', 'recolha'],
    ['coletas', 'recolhas'],
    ['selecionar', 'seleccionar'],
    ['selecione', 'seleccione'],
    ['selecionado', 'seleccionado'],
    ['selecionada', 'seleccionada'],
    ['selecionados', 'seleccionados'],
    ['selecionadas', 'seleccionadas'],
    ['seleção', 'selecção'],
    ['digite', 'introduza'],
    ['digitar', 'introduzir'],
    ['confira', 'verifique'],
];

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

const RULES = [];
for (const [from, to] of TERMS) {
    if (from === to) continue;
    const variants = from === from.toUpperCase() ? [[from, to]] : [[from, to], [cap(from), cap(to)], [from.toUpperCase(), to.toUpperCase()]];
    for (const [f, t] of variants) {
        RULES.push([new RegExp(`(?<![\\p{L}\\p{N}_-])${escapeRe(f)}(?![\\p{L}\\p{N}_])`, 'gu'), t]);
    }
}

/** Only touch the value part of `key: value` lines; never keys, never {placeholders}. */
function convertLine(line) {
    const m = line.match(/^(\s*(?:-\s+)?[^:#'"\s][^:]*:\s+)(.*)$/) || line.match(/^(\s*-\s+)(.*)$/) || line.match(/^(\s+)([^\s].*)$/);
    if (!m) return line;
    const [, head, value] = m;
    if (!value || value === '|' || value === '>' || value === '|-' || value === '>-') return line;
    // protect ICU placeholders / html attributes
    const protectedParts = [];
    let v = value.replace(/\{[^{}]*\}|<[^>]+>/g, (p) => {
        protectedParts.push(p);
        return `\u0000${protectedParts.length - 1}\u0000`;
    });
    for (const [re, to] of RULES) v = v.replace(re, to);
    v = v.replace(/\u0000(\d+)\u0000/g, (_, i) => protectedParts[Number(i)]);
    return head + v;
}

function convert(text) {
    return text
        .split(/\r?\n/)
        .map((l) => (/^\s*#/.test(l) ? l : convertLine(l)))
        .join('\n');
}

/** Minimal reader for "dotted.key: value" override files (one per line). */
function readOverrides(file) {
    if (!file || !fs.existsSync(file)) return {};
    const out = {};
    for (const raw of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
        const m = raw.match(/^([\w.-]+):\s+(.*)$/);
        if (m) out[m[1]] = m[2];
    }
    return out;
}

/** Apply dotted-key overrides to an indented YAML document (2/4-space nesting). */
function applyOverrides(text, overrides) {
    if (!Object.keys(overrides).length) return text;
    const stack = [];
    return text
        .split('\n')
        .map((line) => {
            const m = line.match(/^(\s*)([\w-]+):(\s*)(.*)$/);
            if (!m) return line;
            const indent = m[1].length;
            while (stack.length && stack[stack.length - 1].indent >= indent) stack.pop();
            stack.push({ indent, key: m[2] });
            const dotted = stack.map((s) => s.key).join('.');
            if (m[4] && Object.prototype.hasOwnProperty.call(overrides, dotted)) {
                return `${m[1]}${m[2]}: ${overrides[dotted]}`;
            }
            return line;
        })
        .join('\n');
}

function generate(src, dest, overridesFile) {
    const header = '# Generated by scripts/transweb/make-pt-mz.js from pt-br.yaml — Português (Moçambique).\n';
    const out = applyOverrides(convert(fs.readFileSync(src, 'utf8')), readOverrides(overridesFile));
    fs.writeFileSync(dest, header + out.replace(/^# Generated by .*\n/, ''));
}

function packageDirs(nodeModules) {
    const dirs = [];
    const list = (d) => (fs.existsSync(d) ? fs.readdirSync(d) : []);
    for (const name of list(nodeModules)) {
        if (name.startsWith('@')) {
            for (const child of list(path.join(nodeModules, name))) {
                const full = `${name}/${child}`;
                if (name === '@fleetbase' || child.endsWith('-engine')) dirs.push(path.join(nodeModules, full));
            }
        } else if (name.endsWith('-engine')) {
            dirs.push(path.join(nodeModules, name));
        }
    }
    return dirs;
}

if (require.main === module) {
    const args = process.argv.slice(2);
    if (args[0] === '--node-modules') {
        const nm = path.resolve(args[1] || 'node_modules');
        let n = 0;
        for (const dir of packageDirs(nm)) {
            const real = fs.realpathSync(dir);
            const src = path.join(real, 'translations', 'pt-br.yaml');
            if (!fs.existsSync(src)) continue;
            generate(src, path.join(real, 'translations', 'pt-mz.yaml'));
            n++;
            console.log(`[transweb] pt-mz: ${path.relative(nm, dir)}`);
        }
        console.log(`[transweb] pt-mz generated for ${n} package(s)`);
    } else if (args.length >= 2) {
        generate(path.resolve(args[0]), path.resolve(args[1]), args[2] && path.resolve(args[2]));
        console.log(`[transweb] pt-mz: ${args[1]}`);
    } else {
        console.error('Usage: make-pt-mz.js <pt-br.yaml> <pt-mz.yaml> [overrides.yaml] | --node-modules <dir>');
        process.exit(1);
    }
}

module.exports = { convert, applyOverrides };
