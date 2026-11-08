import PhoneInputComponent from '@fleetbase/ember-ui/components/phone-input';
import { action } from '@ember/object';
import { debug } from '@ember/debug';
import intlTelInput from 'intl-tel-input';
import lookupUserIp from '@fleetbase/ember-core/utils/lookup-user-ip';
import config from '@fleetbase/console/config/environment';

/**
 * Transweb override of ember-ui's <PhoneInput />: same behaviour, but falls back to Mozambique (+258)
 * instead of the US when the IP lookup fails or returns nothing. The template is inherited.
 */
export default class TranswebPhoneInputComponent extends PhoneInputComponent {
    get fallbackCountry() {
        return (config.transweb?.defaultCountry ?? 'MZ').toLowerCase();
    }

    @action setupIntlTelInput(element) {
        const fallback = this.fallbackCountry;

        this.iti = intlTelInput(element, {
            containerClass: `w-full ${this.args.wrapperClass ?? ''}`,
            initialCountry: this.args.country ? String(this.args.country).toLowerCase() : 'auto',
            separateDialCode: true,
            formatAsYouType: true,
            geoIpLookup: async (success) => {
                try {
                    const ipData = await lookupUserIp();
                    success(ipData?.country_code ? ipData.country_code : fallback);
                } catch (error) {
                    debug(`[transweb] IP lookup failed, defaulting phone country to ${fallback}: ${error.message}`);
                    success(fallback);
                }
            },
            utilsScript: '/assets/libphonenumber/utils.js',
        });

        if (typeof this.args.onInit === 'function') {
            this.args.onInit(this.iti);
        }

        element.addEventListener('countrychange', this.args.onCountryChange);
    }
}
