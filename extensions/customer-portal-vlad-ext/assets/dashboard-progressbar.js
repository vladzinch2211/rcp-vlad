class DashboardProgressbar extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {
    window.addEventListener('customer-portal:ready', this._onPortalReady);
  }

  disconnectedCallback() {
    window.removeEventListener('customer-portal:ready', this._onPortalReady);
  }

  _formatMoney(amount) {
    const moneyFormat = window.theme?.moneyFormat || "${{amount}}";
    const value = (parseFloat(amount) || 0).toFixed(2);
    return moneyFormat.replace(/\{\{\s*amount\s*\}\}/, value);
  }

  _onPortalReady = async () => {
    if (
      window.recharge &&
      window.recharge.subscription &&
      window.rechargeHelper &&
      window.rechargeHelper.session
    ) {
      try {
        const result = await window.recharge.subscription.listSubscriptions(
          window.rechargeHelper.session,
          { expand: ["product", "address"] }
        );
        let price = "";
        if (result && Array.isArray(result.subscriptions) && result.subscriptions.length > 0) {
          price = result.subscriptions[0].price || "";
        }
        this.setAttribute('data-current-amount', price);

        const total = parseFloat(this.getAttribute('data-total-amount')) || 0;
        const current = parseFloat(price) || 0;
        const diff = Math.max(total - current, 0);

        const formattedDiff = this._formatMoney(diff);

        const el = this.querySelector('[data-progress-amount]');
        if (el) {
          el.textContent = formattedDiff;
        }

        let percent = 0;
        if (total > 0) {
          percent = Math.min(Math.round((current / total) * 100), 100);
        }
        this.style.setProperty('--percent', percent + '%');
      } catch (err) {
        // Silent fail in production
      }
    }
  };
}

customElements.define('dashboard-progressbar', DashboardProgressbar);
