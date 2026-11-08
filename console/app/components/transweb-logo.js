import Component from '@glimmer/component';

/**
 * <TranswebLogo @brand={{@brand}} @class="h-10 mx-auto" />
 *
 * The API returns a default logo_url when no logo was uploaded; only an uploaded logo (logo_uuid set)
 * is treated as a custom logo, so the default case can switch between light/dark wordmarks.
 */
export default class TranswebLogoComponent extends Component {
    get customLogoUrl() {
        const brand = this.args.brand;
        if (!brand) return null;
        const uuid = brand.logo_uuid ?? (typeof brand.get === 'function' ? brand.get('logo_uuid') : null);
        const url = brand.logo_url ?? (typeof brand.get === 'function' ? brand.get('logo_url') : null);
        return uuid && url ? url : null;
    }
}
