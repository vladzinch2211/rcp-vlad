class UpcomingOrdersList extends HTMLElement {
  constructor() {
    super();
    this._onPortalReady = this._onPortalReady.bind(this);
  }

  connectedCallback() {
    window.addEventListener("customer-portal:ready", this._onPortalReady);
  }

  disconnectedCallback() {
    window.removeEventListener("customer-portal:ready", this._onPortalReady);
  }

  async _onPortalReady() {
    // Fetch subscriptions with product and address expansion
    console.log(">>>>>>>>>>>>>>>>>>>>>>>>>>>>> orders ↓");
    if (
      window.recharge &&
      window.recharge.subscription &&
      window.rechargeHelper &&
      window.rechargeHelper.session
    ) {
      try {
        const result = await window.recharge.subscription.listSubscriptions(
          window.rechargeHelper.session,
          { expand: ["product", "address"] },
        );
        console.log("🔔 Subscriptions with expand from Recharge:", result);

        // Clear content
        this.innerHTML = "";
        if (result && Array.isArray(result.subscriptions)) {
          result.subscriptions.forEach((sub) => {
            const item = document.createElement("upcoming-order-item");
            item.subscription = sub;
            item.classList.add("rcp-block");
            this.appendChild(item);
          });
        }
      } catch (err) {
        console.error("Error fetching subscriptions:", err);
      }
    }
  }
}

// Helper to format date as MM/DD/YYYY
function formatDateMMDDYYYY(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "";
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const yyyy = date.getFullYear();
  return `${mm}/${dd}/${yyyy}`;
}

// Asynchronous function to find product image by external_product_id.ecommerce
async function findProductImageByExternalId(externalId) {
  if (
    !window.recharge ||
    !window.recharge.product ||
    !window.recharge.product.productSearch ||
    !window.rechargeHelper ||
    !window.rechargeHelper.session
  ) {
    return null;
  }
  try {
    // We receive all the products of the store (you can add pagination if necessary)
    const productsResult = await window.recharge.product.productSearch(
      window.rechargeHelper.session,
      {
        format_version: "2022-06",
      }
    );
    if (productsResult && Array.isArray(productsResult.products)) {
      const found = productsResult.products.find(
        (prod) => String(prod.external_product_id) === String(externalId)
      );
      if (
        found &&
        Array.isArray(found.images) &&
        found.images[0] &&
        found.images[0].medium
      ) {
        return found.images[0].medium;
      }
    }
  } catch (err) {
    console.error("Error in findProductImageByExternalId:", err);
  }
  return null;
}

class UpcomingOrderItem extends HTMLElement {
  set subscription(sub) {
    this._subscription = sub;
    this.render();
  }
  get subscription() {
    return this._subscription;
  }

  async render() {
    if (!this._subscription) return;
    const {
      id,
      quantity,
      order_interval_frequency: intervalFreq,
      order_interval_unit: intervalUnit,
      created_at: subscriptionDate,
      next_charge_scheduled_at: nextChargeDate,
      external_product_id,
    } = this._subscription;

    const formattedSubscriptionDate = formatDateMMDDYYYY(subscriptionDate);
    const formattedNextChargeDate = formatDateMMDDYYYY(nextChargeDate);

    // Get external_product_id.ecommerce for image search
    let externalId =
      external_product_id && typeof external_product_id === "object"
        ? external_product_id.ecommerce
        : external_product_id;

    let productImg = window.RCP_TRANSLATIONS?.order_item?.product_placeholder_svg || "";

    // Asynchronously search for image
    const foundImg = await findProductImageByExternalId(externalId);
    if (foundImg) {
      productImg = `<img src="${foundImg}" alt="" />`;
    }

    this.innerHTML = `
      <div class="rcp-font-optimalMedium rcp-rounded-xl rcp-bg-white rcp-px-3 rcp-pb-6 rcp-pt-5 rcp-text-sm rcp-text-primary-base rcp-shadow-[0_4px_48px_rgba(0,0,0,0.08)] md:rcp-p-5">
        <div class="rcp-flex rcp-flex-col rcp-flex-nowrap rcp-items-stretch rcp-justify-start rcp-gap-4 md:rcp-flex-row md:rcp-items-center">
          <div class="rcp-grid rcp-grid-cols-[94px_1fr] rcp-gap-x-4 md:rcp-grow lg:rcp-gap-x-8">
            <div class="rcp-row-span-2 md:rcp-row-span-3">
              <div class="rcp-aspect-square rcp-overflow-hidden rcp-rounded-2xl [&_*]:rcp-h-full [&_*]:rcp-w-full [&_*]:rcp-object-contain">
                ${productImg}
              </div>
            </div>
            <div class="rcp-pt-2 lg:rcp-pt-0.5">
              <h3 class="rcp-font-hanleyMonolineSans rcp-text-base rcp-uppercase rcp-text-inherit lg:rcp-text-lg">
                ${window.RCP_TRANSLATIONS?.order_item?.title || "order #"}${id}
              </h3>
            </div>
            <div class="rcp-flex rcp-flex-col rcp-flex-nowrap rcp-items-start rcp-justify-start rcp-gap-2 rcp-pt-1 rcp-text-base !rcp-leading-none md:rcp-order-1 lg:rcp-flex lg:rcp-flex-row lg:rcp-items-center lg:rcp-gap-4 lg:rcp-pt-3 lg:rcp-pb-1 lg:rcp-text-lg">
              <strong>${window.RCP_TRANSLATIONS?.order_item?.status || "Status"}:</strong>
              <span class="rcp-rounded-full rcp-bg-primary-gray rcp-px-3 rcp-py-2 lg:rcp-py-1.5">
                Every ${intervalFreq} ${intervalUnit}
              </span>
            </div>
            <div class="rcp-col-span-2 rcp-flex-row rcp-flex-wrap rcp-items-start rcp-justify-start rcp-gap-x-8 rcp-gap-y-1 rcp-space-y-3 rcp-pb-4 rcp-pt-8 md:rcp-col-span-1 lg:rcp-flex lg:rcp-space-y-0 lg:rcp-pb-0 lg:rcp-pt-4">
              <dl class="rcp-flex rcp-flex-row rcp-flex-wrap rcp-items-start rcp-justify-start rcp-gap-1 lg:rcp-flex-nowrap">
                <dt class="rcp-whitespace-nowrap rcp-font-bold">${window.RCP_TRANSLATIONS?.order_item?.total_products || "Total Products"}:</dt>
                <dd class="rcp-text-primary-base/70">${quantity ?? "N/A"}</dd>
              </dl>
              <dl class="rcp-flex rcp-flex-row rcp-flex-wrap rcp-items-start rcp-justify-start rcp-gap-1 lg:rcp-flex-nowrap">
                <dt class="rcp-whitespace-nowrap rcp-font-bold">${window.RCP_TRANSLATIONS?.order_item?.subscription_date || "Subscription Date:"}:</dt>
                <dd class="rcp-text-primary-base/70">${formattedSubscriptionDate}</dd>
              </dl>
              <dl class="rcp-flex rcp-flex-row rcp-flex-wrap rcp-items-start rcp-justify-start rcp-gap-1 lg:rcp-flex-nowrap">
                <dt class="rcp-whitespace-nowrap rcp-font-bold">${window.RCP_TRANSLATIONS?.order_item?.expected_delivery || "Expected Delivery"}:</dt>
                <dd class="rcp-text-primary-base/70">${formattedNextChargeDate}</dd>
              </dl>
            </div>
          </div>
          <div
            class="rcp-flex rcp-flex-row rcp-flex-nowrap rcp-items-start rcp-justify-start rcp-gap-3"
          >
            ${window.RCP_TRANSLATIONS?.order_item?.button_edit_html || ""}
            <button
              class="cp-button cp-button--primary rcp-min-h-11 rcp-min-w-20 md:rcp-min-w-32"
            >
              ${window.RCP_TRANSLATIONS?.order_item?.button_view || "View"}
            </button>
          </div>
        </div>
      </div>
    `;
  }
}

customElements.define("upcoming-orders-list", UpcomingOrdersList);
customElements.define("upcoming-order-item", UpcomingOrderItem);
