import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import config from '@fleetbase/console/config/environment';

/**
 * Transweb override of ember-ui's <FleetbaseAttribution />.
 *
 * Shows the Transweb identity while keeping what AGPL-3.0 requires of a modified, network-served
 * distribution: credit to the upstream project, the upstream legal notice, and a link to the
 * corresponding source code (TRANSWEB_SOURCE_URL).
 */
export default class FleetbaseAttributionComponent extends Component {
    @service modalsManager;

    get brand() {
        return config.transweb?.name ?? 'Transweb';
    }

    get companyName() {
        return config.transweb?.companyName;
    }

    get sourceUrl() {
        return config.transweb?.sourceUrl;
    }

    get year() {
        return new Date().getFullYear();
    }

    get appVersion() {
        return config.version ? `v${config.version}` : null;
    }

    @action openLegalNotice() {
        this.modalsManager.show('modals/fleetbase-legal-notice', {
            title: 'Avisos legais / Legal notices',
            acceptButtonText: 'OK',
            acceptButtonIcon: 'check',
            hideDeclineButton: true,
            modalClass: 'modal-md fleetbase-legal-notice-modal',
        });
    }
}
