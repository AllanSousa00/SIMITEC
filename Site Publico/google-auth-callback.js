const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
const search = new URLSearchParams(window.location.search);
const credential = hash.get("id_token") || search.get("id_token") || "";
const googleError = hash.get("error_description") || hash.get("error") || search.get("error_description") || search.get("error") || "";
const stateNonce = hash.get("state") || search.get("state") || hash.get("nonce") || search.get("nonce") || "";
const resultKey = "simitec_google_auth_result";
const title = document.querySelector("#title");
const message = document.querySelector("#message");
const closeButton = document.querySelector("#closeButton");

function publish(payload) {
  const fullPayload = {
    type: "simitec-google-credential",
    nonce: stateNonce,
    createdAt: Date.now(),
    ...payload
  };
  try {
    localStorage.setItem(resultKey, JSON.stringify(fullPayload));
  } catch (_error) {
    // postMessage still covers browsers that block storage.
  }
  if (window.opener) {
    window.opener.postMessage(fullPayload, window.location.origin);
    window.opener.focus();
  }
}

function closeSoon() {
  let attempts = 0;
  const closeTimer = window.setInterval(() => {
    attempts += 1;
    window.open("", "_self");
    window.close();
    if (attempts >= 8) {
      window.clearInterval(closeTimer);
      closeButton.hidden = false;
    }
  }, 250);
}

closeButton.addEventListener("click", () => {
  window.open("", "_self");
  window.close();
});

async function finishLogin() {
  if (googleError) {
    throw new Error(googleError);
  }
  if (!credential) {
    throw new Error("O Google não retornou o token de acesso.");
  }

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 12000);
  const response = await fetch("/api/auth/google", {
    method: "POST",
    credentials: "include",
    signal: controller.signal,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ credential })
  }).finally(() => window.clearTimeout(timeout));
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || "Não foi possível confirmar o login Google.");
  }
  return data;
}

finishLogin()
  .then((data) => {
    title.textContent = "Login concluído";
    message.textContent = "A conta foi conectada. Voltando para a SIMITEC...";
    publish({
      sessionReady: true,
      user: data.user,
      needsProfileCompletion: Boolean(data.needsProfileCompletion)
    });
    closeSoon();
  })
  .catch((error) => {
    title.textContent = "Não foi possível entrar";
    message.textContent = error.name === "AbortError"
      ? "O servidor demorou para confirmar o Google. Tente novamente."
      : (error.message || "Tente novamente pela janela principal.");
    publish({ error: message.textContent });
    closeButton.hidden = false;
  });
