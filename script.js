async function init() {
  try {
    console.log("TORRE: a iniciar...");

    await loadColumns();
    console.log("TORRE: colunas:", columns);

    await loadRows();
    console.log("TORRE: linhas:", rows);

    await ensureRows();
    console.log("TORRE: linhas depois de ensureRows:", rows);

    await render();
    console.log("TORRE: grelha carregada");

  } catch (error) {
    console.error("TORRE ERROR:", error);

    document.body.innerHTML = `
      <div style="
        padding: 40px;
        font-family: Arial, Helvetica, sans-serif;
        color: white;
        background: #0000ff;
      ">
        <h2>TORRE — erro</h2>
        <pre style="white-space: pre-wrap;">${error.message}</pre>
      </div>
    `;
  }
}

init();
