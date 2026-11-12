import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import config from '@fleetbase/console/config/environment';

/**
 * Transweb override of ember-ui's <FleetbaseAttribution />.
 *
 * Shows only the Transweb identity (no "Powered by Fleetbase" link). What AGPL-3.0 requires of a
 * modified, network-served distribution (the upstream copyright/licence notices and an offer of the
 * corresponding source code, TRANSWEB_SOURCE_URL) lives in the "Legal notices" dialog this footer
 * opens: see components/modals/fleetbase-legal-notice. Keep that button.
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
