document.addEventListener("DOMContentLoaded", function () {
  //We are waiting for the SDK to be ready
  window.addEventListener("recharge:ready", function () {
    setupPortal();
  });

  //Session data
  let currentSession = null;
  let customerData = null;

  function setupPortal() {
    // Check saved session on load
    checkSavedSession();
    setupAuthForms();
    setupNavigation();
    setupSessionExtension();
  }

  // Setup automatic session extension
  function setupSessionExtension() {
    // Extend session on user activity
    const activities = ["click", "keypress", "scroll", "mousemove"];
    let lastActivity = Date.now();

    activities.forEach((event) => {
      document.addEventListener(
        event,
        () => {
          const now = Date.now();
          // Extend session no more than once every 5 minutes
          if (now - lastActivity > 5 * 60 * 1000) {
            lastActivity = now;
            if (window.rechargeSessionManager && currentSession) {
              window.rechargeSessionManager.extendSession();
            }
          }
        },
        { passive: true },
      );
    });

    // Warn about upcoming session expiration
    setInterval(() => {
      if (window.rechargeSessionManager && currentSession) {
        const timeLeft = window.rechargeSessionManager.getSessionTimeLeft();

        if (timeLeft <= 30 && timeLeft > 25) {
          showMessage(
            "⚠️ Session expires in " + timeLeft + " minutes",
            "warning",
          );
        } else if (timeLeft <= 5 && timeLeft > 0) {
          showMessage(
            "⚠️ Session expires in " +
              timeLeft +
              " minutes. Click any button to extend.",
            "warning",
          );
        } else if (timeLeft === 0) {
          showMessage(
            "❌ Session expired. Redirecting to login page...",
            "error",
          );
          setTimeout(logout, 3000);
        }
      }
    }, 60000); // Check every minute
  }

  // Function to check saved session
  async function checkSavedSession() {
    try {
      if (!window.rechargeSessionManager) {
        setTimeout(checkSavedSession, 100);
        return;
      }

      const sessionData = window.rechargeSessionManager.restoreSession();

      if (sessionData) {
        currentSession = sessionData;

        // Restore session in SDK
        if (
          window.rechargeHelper &&
          window.rechargeHelper.restoreSession(sessionData)
        ) {
          // Check session validity
          try {
            const testCustomer = await window.rechargeHelper.getCustomer();
            if (testCustomer) {
              // Show session time information
              const timeLeft =
                window.rechargeSessionManager.getSessionTimeLeft();

              showPortal();
              return;
            }
          } catch (error) {}
        }
      }

      // If session is invalid, clear it
      if (window.rechargeSessionManager) {
        window.rechargeSessionManager.clearSession();
      }
    } catch (error) {
      console.error("❌ Session restoration error:", error);
      if (window.rechargeSessionManager) {
        window.rechargeSessionManager.clearSession();
      }
    }
  }

  // Function to save session
  function saveSession(session) {
    try {
      if (window.rechargeSessionManager) {
        window.rechargeSessionManager.saveSession(session);
      } else {
        console.warn("⚠️ Session manager unavailable, using fallback");
        // Fallback to simple sessionStorage
        const expiryTime = Date.now() + 24 * 60 * 60 * 1000;
        sessionStorage.setItem("recharge_session", JSON.stringify(session));
        sessionStorage.setItem(
          "recharge_session_expiry",
          expiryTime.toString(),
        );
      }
    } catch (error) {
      console.error("❌ Session save error:", error);
    }
  }

  // Function to clear saved session
  function clearSavedSession() {
    if (window.rechargeSessionManager) {
      window.rechargeSessionManager.clearSession();
    } else {
      // Fallback
      sessionStorage.removeItem("recharge_session");
      sessionStorage.removeItem("recharge_session_expiry");
    }
  }

  function setupAuthForms() {
    const emailForm = document.getElementById("recharge-email-form");
    const codeForm = document.getElementById("recharge-code-form");
    const messageDiv = document.getElementById("message");
    const checkEmailBtn = document.getElementById("check-email-btn");
    const manualSwitchBtn = document.getElementById("manual-switch-btn");

    if (
      !emailForm ||
      !codeForm ||
      !messageDiv ||
      !checkEmailBtn ||
      !manualSwitchBtn
    ) {
      console.error("No form elements found");
      return;
    }

    //Manual switch button
    manualSwitchBtn.addEventListener("click", function () {
      document.getElementById("email-form").style.display = "none";
      document.getElementById("code-form").style.display = "block";
      manualSwitchBtn.style.display = "none";
    });

    //Email verification button
    checkEmailBtn.addEventListener("click", async function () {
      const emailInput = document.getElementById("recharge-email");
      const email = emailInput.value.trim();

      if (!email) {
        messageDiv.textContent = "Enter email address";
        return;
      }

      // messageDiv.textContent = 'Sending code...';
      checkEmailBtn.disabled = true;
      checkEmailBtn.textContent = "Sending...";

      try {
        const result = await window.recharge.sendCode(email);

        if (result.success) {
          messageDiv.textContent = "Code sent to " + email;

          //Add diagnostics for switching forms
          const emailFormEl = document.getElementById("email-form");
          const codeFormEl = document.getElementById("code-form");

          if (emailFormEl) {
            emailFormEl.style.display = "none";
          }

          if (codeFormEl) {
            codeFormEl.style.display = "block";
          } else {
            //If the code form is not found, show the manual switch button
            manualSwitchBtn.style.display = "block";
          }
        } else {
          messageDiv.textContent =
            "Error: " + (result.error || "Could not send code");
          checkEmailBtn.disabled = false;
          checkEmailBtn.textContent = "Check Account";
        }
      } catch (error) {
        console.error("Error:", error);
        messageDiv.textContent = "Error: " + error.message;
        checkEmailBtn.disabled = false;
        checkEmailBtn.textContent = "Check Account";
      }
    });

    //Code check
    codeForm.addEventListener("submit", async function (e) {
      e.preventDefault(); //Prevent page reload
      e.stopPropagation();

      const codeInput = document.getElementById("recharge-code");
      const emailInput = document.getElementById("recharge-email");
      const code = codeInput.value.trim();
      const email = emailInput.value.trim();

      if (!code) {
        messageDiv.textContent = "Enter verification code";
        return;
      }

      messageDiv.textContent = "Verifying code...";

      try {
        const result = await window.recharge.verifyCode(email, code);

        if (result.success) {
          currentSession = result;

          // Save session
          saveSession(result);

          showMessage("Successful login!", "success");

          //Switch to the portal
          setTimeout(() => {
            showPortal();
          }, 1000);
        } else {
          messageDiv.textContent = "Error: " + (result.error || "Invalid code");
        }
      } catch (error) {
        console.error("Error:", error);
        messageDiv.textContent = "Error: " + error.message;
      }
    });
  }

  function setupNavigation() {
    const portalSidebar = document.querySelector("[data-portal-sidebar]");

    const navItems = portalSidebar
      ? portalSidebar.querySelectorAll(".nav-item")
      : [];

    navItems.forEach((item, index) => {
      const section = item.getAttribute("data-section");

      item.addEventListener("click", function (e) {
        e.preventDefault(); // Prevent link navigation

        if (section === "logout") {
          logout();
          return;
        }

        //Switch the active navigation item
        navItems.forEach((nav) => nav.classList.remove("active"));
        this.classList.add("active");

        //Switch content
        switchToSection(section);
      });
    });
  }

  function showMessage(text, type = "info") {
    const messageDiv = document.getElementById("message");
    if (messageDiv) {
      messageDiv.textContent = text;

      // Clear previous classes
      messageDiv.className = "";

      // Add class based on type
      switch (type) {
        case "success":
          messageDiv.className = "alert-success";
          break;
        case "error":
          messageDiv.className = "alert-error";
          break;
        case "warning":
          messageDiv.className = "alert-warning";
          break;
        default:
          messageDiv.className = "alert-info";
      }

      // Automatically hide success messages after 5 seconds
      if (type === "success") {
        setTimeout(() => {
          if (messageDiv.textContent === text) {
            messageDiv.textContent = "";
            messageDiv.className = "";
          }
        }, 5000);
      }
    }
  }

  async function showPortal() {
    //Hide authentication
    document.querySelector("[data-auth-container]").style.display = "none";

    //Show the portal
    document.getElementById("portal-layout").style.display = "block";

    //Load overview data
    await loadOverview();

    // Dispatch event after portal and customer data loaded
    window.dispatchEvent(
      new CustomEvent("customer-portal:ready", {
        detail: {
          session: currentSession,
          customer: customerData,
        },
      }),
    );
  }

  async function switchToSection(sectionName) {
    //Hide all sections
    const sections = document.querySelectorAll(".section-content");
    sections.forEach((section) => section.classList.remove("active"));

    //Show the desired section
    const targetSection = document.getElementById(`section-${sectionName}`);
    if (targetSection) {
      targetSection.classList.add("active");

      //Load data for the section
      await loadSectionData(sectionName);
    }
  }

  async function loadSectionData(sectionName) {
    try {
      switch (sectionName) {
        case "overview":
          await loadOverview();
          break;
        case "next-order":
          await loadNextOrder();
          break;
        case "previous-orders":
          await loadPreviousOrders();
          break;
        case "subscriptions":
          await loadSubscriptions();
          break;
        case "addresses":
          await loadAddresses();
          break;
      }
    } catch (error) {
      console.error(`Error loading section ${sectionName}:`, error);
    }
  }

  async function loadOverview() {
    try {
      const customer = await window.recharge.getCustomer();
      const subscriptions = await window.recharge.getSubscriptions();

      customerData = customer;

      const content = document.getElementById("customer-info");
      if (content) {
        content.innerHTML = `
          <div class="subscription-card">
            <h4>Account Information</h4>
            <p><strong>Customer ID:</strong> ${currentSession.customerId || "N/A"}</p>
            <p><strong>Email:</strong> ${customer.email || "N/A"}</p>
            <p><strong>Name:</strong> ${customer.first_name || ""} ${customer.last_name || ""}</p>
            <p><strong>Active Subscriptions:</strong> ${subscriptions.length}</p>
          </div>
        `;
      }
    } catch (error) {
      console.error("Error loading overview:", error);
    }
  }

  async function loadSubscriptions() {
    try {
      const subscriptions = await window.recharge.getSubscriptions();

      const content = document.getElementById("subscriptions-content");
      if (content) {
        if (subscriptions.length === 0) {
          content.innerHTML = "<p>No subscriptions found</p>";
          return;
        }

        content.innerHTML = subscriptions
          .map(
            (sub) => `
          <div class="subscription-card">
            <h4>${sub.product_title || "Product"}</h4>
            <p><strong>ID:</strong> ${sub.id}</p>
            <p><strong>Status:</strong> <span class="subscription-status status-${sub.status}">${sub.status}</span></p>
            <p><strong>Quantity:</strong> ${sub.quantity || "N/A"}</p>
            <p><strong>Frequency:</strong> ${sub.order_interval_frequency || "N/A"} ${sub.order_interval_unit || ""}</p>
            <div class="action-buttons">
              <button class="btn btn-primary">Edit</button>
              <button class="btn btn-secondary">Pause</button>
            </div>
          </div>
        `,
          )
          .join("");
      }
    } catch (error) {
      console.error("Error loading subscriptions:", error);
    }
  }

  async function loadNextOrder() {
    const content = document.getElementById("next-order-content");
    if (content) {
      content.innerHTML = "<p>Loading next order...</p>";
    }
  }

  async function loadPreviousOrders() {
    const content = document.getElementById("previous-orders-content");
    if (content) {
      content.innerHTML = "<p>Loading order history...</p>";
    }
  }

  async function loadAddresses() {
    const content = document.getElementById("addresses-content");
    if (content) {
      content.innerHTML = "<p>Loading addresses and payment methods...</p>";
    }
  }

  function logout() {
    // Clear saved session
    clearSavedSession();

    // Clear current session in memory
    currentSession = null;
    customerData = null;

    // Clear session in SDK
    if (window.rechargeHelper) {
      window.rechargeHelper.session = null;
      window.rechargeHelper.sessionToken = null;
    }

    location.reload();
  }
});
