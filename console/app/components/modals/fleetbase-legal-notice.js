import Component from '@glimmer/component';
import config from '@fleetbase/console/config/environment';

/**
 * Transweb override of ember-ui's legal notice dialog (opened from the footer's "Legal notices").
 *
 * Leads with Transweb and offers the source code of this modified version (TRANSWEB_SOURCE_URL),
 * as AGPL-3.0 section 13 requires for software used over a network, then keeps Fleetbase's
 * copyright and licence notices (section 5 "Appropriate Legal Notices"). Do not remove either part.
 */
export default class TranswebLegalNoticeComponent extends Component {
    get brand() {
        return config.transweb?.name ?? 'Transweb';
    }

    get companyName() {
        return config.transweb?.companyName;
    }

    get sourceUrl() {
        return config.transweb?.sourceUrl ?? 'https://github.com/fjessen/transweb';
    }

    get licenseUrl() {
        return `${this.sourceUrl.replace(/\/$/, '')}/blob/HEAD/LICENSE.md`;
    }

    get year() {
        return new Date().getFullYear();
    }
}
