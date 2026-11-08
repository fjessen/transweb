# Transweb — Rebrand e adaptação para Moçambique

Baseado na análise do repositório upstream `fleetbase/fleetbase` (não da tua instalação local, que não está acessível a partir daqui). Itens marcados **(verificar)** dependem de factos externos que devem ser confirmados antes de se construir.

## 1. Onde vive a marca no Fleetbase

| Camada | Onde | Como se muda |
|---|---|---|
| Logo/ícone em runtime | Console → Admin → Branding (guardado na BD) | UI, sem rebuild |
| Logo/ícone fallback, favicons, manifest | `console/public/images`, `console/public/favicon` | `apply_rebrand.py` + rebuild do console |
| Título, theme-color, loader | `console/app/index.html` | `apply_rebrand.py` |
| Cor primária da UI | escala `sky` em `console/tailwind.config.js` | `apply_rebrand.py` |
| Nome nas strings | `console/translations/*.yaml` (`app.name`, textos de conta/OAuth) | `apply_rebrand.py` (en-us, pt-br) |
| Nome em emails/API | `APP_NAME`, `MAIL_FROM_NAME` (compose + `api/config`) | `apply_rebrand.py` |
| Créditos "Fleetbase" na UI | flag `DISABLE_FLEETBASE_ATTRIBUTION` | **não activar** sem rever AGPL (ver §6) |
| Apps móveis (Navigator, Storefront) | repositórios separados | rebrand e build próprios |

## 2. Aplicar o rebrand (Docker)

```bash
cd /caminho/do/teu/fleetbase
git checkout -b transweb-rebrand
python3 /caminho/transweb-brand/apply_rebrand.py . --dry-run   # ver o que muda
python3 /caminho/transweb-brand/apply_rebrand.py .
docker compose build console          # o console é construído a partir de ./console
docker compose up -d console application queue scheduler
```
Depois, em **Admin → Branding**, carrega `transweb-logo.svg` e `icon.png` para as marcas por organização.
Se a tua instalação usa imagens pré-construídas em vez de `build:`, diz-me e adapto (volume nginx ou Dockerfile próprio).

## 3. Dependências externas a remover (independência de infraestrutura)

- **Routing hospedado pelo Fleetbase / servidor público OSRM** (`router.project-osrm.org`): envia coordenadas de rotas para servidores de terceiros. Para produção, correr **OSRM próprio** com o extracto de Moçambique do Geofabrik (`mozambique-latest.osm.pbf`) e apontar `OSRM_HOST`. Deixei intactas as strings que descrevem o serviço hospedado do Fleetbase porque são factualmente sobre esse serviço.
- **`registry.fleetbase.io`** (`REGISTRY_HOST`): registo de extensões. Aceitável; decidir se se quer registo próprio.
- **Imagens por omissão em `flb-assets.s3...amazonaws.com`** (`console/config/environment.js`, `defaultValues`): trocar por ficheiros próprios para não depender de S3 de terceiros e para ter ícones adequados (ex.: motorizada, chapa, camião).

## 4. Adaptação a Moçambique

**Localização**
- Criar locale `pt-mz` (copiar `pt-br.yaml`; só existe pt-br). Ortografia/terminologia de Moçambique: *utilizador, ecrã, contacto, telemóvel, equipa, guardar, ficheiro, endereço*.
- Fuso `Africa/Maputo` (UTC+2), moeda **MZN**, indicativo **+258**, unidades métricas, formato de data dd/mm/aaaa.
- Países/região por omissão: Moçambique; províncias (10 + Cidade de Maputo) como zonas de serviço pré-definidas.

**Endereços** — a cobertura de ruas é fraca. Priorizar: bairro + ponto de referência + coordenadas partilhadas (pin no mapa, link de localização do WhatsApp); campo "referência/ponto de apoio" obrigatório na criação de encomendas; Nominatim próprio sobre o extracto OSM.

**Pagamentos** — carteiras móveis dominam: **M-Pesa (Vodacom), e-Mola (Movitel), mKesh (Tmcel)**; suportar também pagamento à entrega (numerário) com reconciliação do motorista. Módulo `ledger` do Fleetbase é o ponto de integração. **(verificar)** APIs/condições de cada operador e agregadores locais.

**Fiscal** — NUIT do cliente, IVA (16 % em regra), facturação. **(verificar)** requisitos actuais da Autoridade Tributária sobre software de facturação certificado antes de emitir facturas a partir do Transweb.

**Comunicação** — WhatsApp é o canal principal: notificações de estado da encomenda por WhatsApp Business API, com SMS como alternativa. **(verificar)** cobertura e preços de SMS para Moçambique no fornecedor escolhido (Twilio ou agregador local).

**Operação em campo**
- App do motorista com tolerância a rede fraca (cache offline, filas de sincronização, modo de poupança de dados).
- Tipos de veículo/serviço locais: motorizada, txopela (tuk-tuk), carrinha, camião, chapa/transporte de passageiros; carga por corredor (Maputo–Beira–Nacala, Beira corridor) para transporte rodoviário de longa distância.
- Zonas e tarifas por distrito/bairro; tarifa por km + taxa fixa mínima, em MZN.
- Documentos de transporte: guia de remessa, prova de entrega com foto + assinatura + OTP por SMS/WhatsApp.

**Segurança e produção** (o `docker-compose.yml` upstream é de desenvolvimento)
- MySQL com `MYSQL_ALLOW_EMPTY_PASSWORD: "yes"` e porta 3306 publicada: definir password forte e não publicar a porta.
- `ENVIRONMENT: development` e `SESSION_DOMAIN: localhost`: ajustar para o domínio real, HTTPS (Caddy já incluído em `Caddyfile`), `SOCKETCLUSTER_AUTH_ENABLED=true`.
- Backups da BD agendados e testados; monitorização.

## 5. Ordem sugerida

1. Marca + rebrand estático (feito aqui) → build e validação visual.
2. Locale `pt-mz`, MZN, fuso, países/províncias por omissão.
3. OSRM + Nominatim próprios; remover dependências externas (§3).
4. Pagamentos móveis + notificações WhatsApp.
5. Facturação/NUIT após validação fiscal.
6. App do motorista rebrandizada (Navigator) com modo offline.

## 6. Licença (AGPL-3.0)

O rebrand é permitido. Mantém avisos de copyright upstream e o `LICENSE.md`; se o Transweb for acedido por utilizadores via rede, tens de oferecer-lhes o código-fonte da versão modificada (secção 13). O script gera `NOTICE-TRANSWEB.md` e a recomendação é manter um link para o repositório e a atribuição ao Fleetbase em *Definições → Sobre*. Se quiseres ocultar créditos ou usar o código de forma proprietária, há licença comercial do Fleetbase — não é matéria que eu possa avaliar juridicamente.
