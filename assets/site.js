// Overlayer website: the pricing toggle and the sign-up form. No libraries;
// the only network request is the sign-up, sent when the visitor presses
// Notify me.

(function () {
  "use strict";

  // ---------- Pricing ----------

  // Suggested launch prices. Change them here.
  var PRICES = {
    year: ["$9", "per year"],
    month: ["$2.99", "per month"],
    life: ["$15", "one-time"]
  };
  var proPrice = document.getElementById("proPrice"), proPer = document.getElementById("proPer");
  var bills = document.querySelectorAll(".billing button");
  bills.forEach(function (b) {
    b.addEventListener("click", function () {
      bills.forEach(function (o) { o.setAttribute("aria-pressed", o === b ? "true" : "false"); });
      proPrice.textContent = PRICES[b.dataset.bill][0];
      proPer.textContent = PRICES[b.dataset.bill][1];
    });
  });

  // The closing "Get early access" button jumps back up to the form.
  var ctaTop = document.getElementById("cta-top");
  if (ctaTop) ctaTop.addEventListener("click", function (e) {
    var field = document.getElementById("su-email");
    if (!field) return;
    e.preventDefault();
    field.focus({ preventScroll: true });
    field.scrollIntoView({ block: "center", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  });

  // ---------- Sign-up form ----------

  // Sends the email to FormSubmit, which forwards it to us. Nothing is sent
  // until the visitor presses the button. Without JavaScript the form still
  // posts normally and FormSubmit shows its own thank-you page.
  var form = document.getElementById("signup");
  if (!form || !window.fetch) return;
  var input = document.getElementById("su-email");
  var error = document.getElementById("su-error");
  var status = document.getElementById("su-status");
  var send = document.getElementById("su-send");

  function showError(msg) {
    error.textContent = msg;
    error.hidden = !msg;
    input.setAttribute("aria-invalid", msg ? "true" : "false");
  }
  input.addEventListener("input", function () { if (!error.hidden && input.validity.valid) showError(""); });

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var value = input.value.trim();
    if (!value) { showError("Enter your email address."); input.focus(); return; }
    if (!input.validity.valid || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      showError("That doesn't look like an email address. Check it and try again, for example name@example.com.");
      input.focus();
      return;
    }
    showError("");
    if (form.elements._honey.value) return;  // a bot filled the hidden field

    send.disabled = true;
    send.textContent = "Sending…";
    status.textContent = "Sending…";
    var phone = form.querySelector("input[name=phone]:checked");
    fetch("https://formsubmit.co/ajax/coverski1903@gmail.com", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify({
        email: value,
        phone: phone ? phone.value : "",
        _subject: "Overlayer early access",
        _template: "table",
        _honey: ""
      })
    }).then(function (res) {
      return res.json().then(function (body) { return res.ok && String(body.success) === "true"; });
    }).then(function (ok) {
      if (!ok) throw new Error("rejected");
      form.classList.add("done");
      send.hidden = true;
      status.textContent = "Thanks, you're on the list. We'll email " + value + " when Overlayer launches.";
      status.setAttribute("tabindex", "-1");
      status.focus();
    }).catch(function () {
      send.disabled = false;
      send.textContent = "Notify me";
      status.textContent = "Sorry, that didn't go through. Try again in a moment, or email us at coverski1903@gmail.com.";
    });
  });
})();
