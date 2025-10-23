/**
 * Download the official Recharge Storefront SDK
 * According to the documentation: https://storefront.rechargepayments.com/client/docs/methods/api/auth/
 */

console.log("Loading official Recharge SDK...");

//Download the official SDK from the correct CDN
const script = document.createElement("script");
script.src =
  "https://static.rechargecdn.com/assets/storefront/recharge-client-1.54.1.min.js";
script.type = "text/javascript";

script.onload = function () {
  console.log("Recharge SDK loaded");
  initializeRecharge();
};

script.onerror = function () {
  console.error("Error loading Recharge SDK");
  // Show error to user
  const messageEl = document.getElementById("message");
  if (messageEl) {
    messageEl.textContent = "Error loading Recharge SDK";
  }
};

document.head.appendChild(script);

async function initializeRecharge() {
  try {
    const STOREFRONT_TOKEN =
      "strfnt_63a0bd8b199ac521054e50a32975138e5f9f940edd8d04f1bd19daeef3f5e9a0";

    //According to the documentation: SDK creates a 'recharge' object in window
    if (!window.recharge) {
      throw new Error("window.recharge not found - check SDK loading");
    }

    console.log("SDK object window.recharge:", window.recharge);

    //Initialize according to the documentation: recharge.init()
    const initResult = await window.recharge.init({
      storefrontAccessToken: STOREFRONT_TOKEN,
      appName: "Shopify Theme Integration",
      appVersion: "1.0.0",
    });

    //Create a simplified interface for forms
    window.rechargeHelper = {
      sessionToken: null,
      session: null,

      // Restore session from saved data
      restoreSession(sessionData) {
        if (sessionData && sessionData.apiToken) {
          this.session = sessionData;
          return true;
        }
        return false;
      },

      async sendCode(email) {
        try {
          console.log("📧 Sending code to:", email);

          //According to the documentation for Shopify Theme, we use AppProxy methods
          console.log(
            "🔄 Using sendPasswordlessCodeAppProxy for Shopify Theme...",
          );

          const result =
            await window.recharge.auth.sendPasswordlessCodeAppProxy(email, {
              send_email: true,
              send_sms: false,
            });

          //Analyze the result -if the code is sent, then this is a success
          if (result) {
            //Any result from the API (even without session_token) means that the code has been sent
            if (result.session_token) {
              this.sessionToken = result.session_token;
              console.log("✅ Session token received:", this.sessionToken);
            } else if (typeof result === "string") {
              //If the result is a string (possibly session_token)
              this.sessionToken = result;
              console.log(
                "✅ Session token received (string):",
                this.sessionToken,
              );
            } else {
              //If there is no session_token, but the API responded, the code is still sent
              this.sessionToken = "TEMP_TOKEN"; //Temporary token
              console.log("✅ Code sent, using temporary token");
            }

            return { success: true };
          }

          if (result && result.error) {
            console.log("❌ Error from API:", result.error);
            return { success: false, error: result.error };
          }

          return {
            success: false,
            error: "Email not found in Recharge or subscription inactive",
          };
        } catch (error) {
          console.error("❌ Error sending code:", error);

          if (
            error.message &&
            error.message.includes("Customer does not exist")
          ) {
            return {
              success: false,
              error:
                "Email not found in Recharge. Make sure the subscription is active.",
            };
          }

          return {
            success: false,
            error: error.message || "Error sending code",
          };
        }
      },

      async verifyCode(email, code) {
        try {
          console.log("🔐 Verifying code:", code);

          if (!this.sessionToken) {
            return { success: false, error: "Please request code first" };
          }

          console.log(
            "🔄 Using validatePasswordlessCodeAppProxy for Shopify Theme...",
          );

          //For Shopify Theme we use the AppProxy version
          const session =
            await window.recharge.auth.validatePasswordlessCodeAppProxy(
              email,
              this.sessionToken,
              code,
            );

          console.log(
            "📊 Result from validatePasswordlessCodeAppProxy:",
            JSON.stringify(session, null, 2),
          );

          if (session && session.apiToken) {
            this.session = session;
            console.log("✅ Authentication successful, apiToken received");

            return {
              success: true,
              customerId: session.customerId,
              apiToken: session.apiToken,
            };
          }

          return { success: false, error: "Invalid code" };
        } catch (error) {
          console.error("❌ Code verification error:", error);
          return {
            success: false,
            error: error.message || "Code verification error",
          };
        }
      },

      async getSubscriptions() {
        try {
          if (!this.session) {
            throw new Error("You must login");
          }

          console.log("📋 Getting subscriptions...");

          const subscriptions =
            await window.recharge.subscription.listSubscriptions(this.session);
          console.log("📊 Subscriptions:", subscriptions);

          return subscriptions.subscriptions || [];
        } catch (error) {
          console.error("❌ Error receiving subscriptions:", error);
          return [];
        }
      },

      async getCustomer() {
        try {
          if (!this.session) {
            throw new Error("You must login");
          }

          console.log("👤 Getting customer data...");

          const customer = await window.recharge.customer.getCustomer(
            this.session,
          );
          console.log("📊 Customer:", customer);

          return customer.customer || customer;
        } catch (error) {
          console.error("❌ Error getting customer:", error);
          return null;
        }
      },

      async getDeliverySchedule() {
        try {
          if (!this.session) {
            throw new Error("You must login");
          }

          console.log("📅 Getting delivery schedule...");

          const schedule = await window.recharge.customer.getDeliverySchedule(
            this.session,
            {
              date_max: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
                .toISOString()
                .split("T")[0],
            },
          );
          console.log("📊 Schedule:", schedule);

          return schedule;
        } catch (error) {
          console.error("❌ Error getting schedule:", error);
          return null;
        }
      },

      async getOrders(options = {}) {
        try {
          if (!this.session) {
            throw new Error("You must login");
          }

          console.log("📦 Getting orders with options:", options);

          // Recharge API does not support status parameter for listOrders
          // Remove status if present
          const safeOptions = { ...options };
          if ('status' in safeOptions) {
            delete safeOptions.status;
          }

          const orders = await window.recharge.order.listOrders(
            this.session,
            safeOptions,
          );
          console.log("📊 Orders:", orders);

          return orders.orders || [];
        } catch (error) {
          console.error("❌ Error receiving orders:", error);
          return [];
        }
      },

      async getAddresses() {
        try {
          if (!this.session) {
            throw new Error("You must login");
          }

          console.log("🏠 Getting addresses...");

          const addresses = await window.recharge.address.listAddresses(
            this.session,
          );
          console.log("📊 Addresses:", addresses);

          return addresses.addresses || [];
        } catch (error) {
          console.error("❌ Error getting addresses:", error);
          return [];
        }
      },

      async getPaymentMethods() {
        try {
          if (!this.session) {
            throw new Error("You must login");
          }

          console.log("💳 Getting payment methods...");

          const paymentMethods =
            await window.recharge.paymentMethod.listPaymentMethods(
              this.session,
            );
          console.log("📊 Payment methods:", paymentMethods);

          return paymentMethods.payment_methods || [];
        } catch (error) {
          console.error("❌ Error retrieving payment methods:", error);
          return [];
        }
      },
    };

    //Create backward compatibility for forms
    window.recharge.sendCode = window.rechargeHelper.sendCode.bind(
      window.rechargeHelper,
    );
    window.recharge.verifyCode = window.rechargeHelper.verifyCode.bind(
      window.rechargeHelper,
    );
    window.recharge.getSubscriptions =
      window.rechargeHelper.getSubscriptions.bind(window.rechargeHelper);
    window.recharge.getCustomer = window.rechargeHelper.getCustomer.bind(
      window.rechargeHelper,
    );
    window.recharge.getDeliverySchedule =
      window.rechargeHelper.getDeliverySchedule.bind(window.rechargeHelper);
    window.recharge.getOrders = window.rechargeHelper.getOrders.bind(
      window.rechargeHelper,
    );
    window.recharge.getAddresses = window.rechargeHelper.getAddresses.bind(
      window.rechargeHelper,
    );
    window.recharge.getPaymentMethods =
      window.rechargeHelper.getPaymentMethods.bind(window.rechargeHelper);

    //Notify about readiness
    window.dispatchEvent(new CustomEvent("recharge:ready"));
  } catch (error) {
    console.error("❌ Recharge initialization error:", error);

    //Show the error to the user
    const messageEl = document.getElementById("message");
    if (messageEl) {
      messageEl.textContent = "Initialization error: " + error.message;
    }
  }
}
