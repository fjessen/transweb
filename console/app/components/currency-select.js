import CurrencySelectComponent from '@fleetbase/ember-ui/components/currency-select';
import getCurrency from '@fleetbase/ember-ui/utils/get-currency';
import config from '@fleetbase/console/config/environment';

/**
 * Transweb override of ember-ui's <CurrencySelect />: when no currency is passed in and the user's
 * IP lookup did not resolve one, default to the Mozambican metical (MZN) instead of USD.
 * The template is inherited.
 */
export default class TranswebCurrencySelectComponent extends CurrencySelectComponent {
    constructor() {
        super(...arguments);

        const whois = this.currentUser.getOption('whois');
        const explicit = this.args.currency ?? this.args.value ?? whois?.currency?.code;
        const fallback = config.transweb?.defaultCurrency ?? 'MZN';

        if (!explicit && fallback) {
            this.currency = fallback;
            this.currencyData = this.args.currencyData ?? getCurrency(fallback);
        }
    }
}
