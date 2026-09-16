/* =========================================================
   SUPABASE
========================================================= */

const SUPABASE_URL =
  "https://rvfdobjhfwjdvufwrirp.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_aXh2UjT79AHJpjRXLVZeKA_UCRE96LL";

const BUCKET =
  "images";


/* =========================================================
   ELEMENTOS
========================================================= */

const grid =
  document.getElementById("grid");

const addRowButton =
  document.getElementById("add-row");

const removeRowButton =
  document.getElementById("remove-row");

const addColumnButton =
  document.getElementById("add-column");

const removeColumnButton =
  document.getElementById("remove-column");

const viewer =
  document.getElementById("image-viewer");

const viewerImage =
  document.getElementById("viewer-image");

const torreTitle =
  document.getElementById("torre-title");

const categoryMenu =
  document.getElementById("category-menu");

const categoryTitle =
  document.getElementById("category-title");

const imageFileInput =
  document.getElementById("image-file-input");

const logPanel =
  document.getElementById("log-panel");

const logContent =
  document.getElementById("log-content");

const logList =
  document.getElementById("log-list");

const logForm =
  document.getElementById("log-form");

const logDate =
  document.getElementById("log-date");

const logNumber =
  document.getElementById("log-number");

const logNote =
  document.getElementById("log-note");

const toggleLog =
  document.getElementById("toggle-log");


/* =========================================================
   ESTADO
========================================================= */

let categories = [];

let columns = [];

let rows = [];

let currentCategory = null;


/* =========================================================
   SUPABASE REQUEST
========================================================= */

async function supabaseRequest(
  endpoint,
  options = {}
) {

  const url =
    `${SUPABASE_URL}/rest/v1/${endpoint}`;


  console.log(
    "TORRE REQUEST:",
    url
  );


  const response =
    await fetch(
      url,
      {
        ...options,

        headers: {

          "apikey":
            SUPABASE_KEY,

          "Authorization":
            `Bearer ${SUPABASE_KEY}`,

          "Content-Type":
            "application/json",

          ...(options.headers || {})

        }

      }
    );


  if (!response.ok) {

    const error =
      await response.text();


    console.error(
      "TORRE SUPABASE ERROR:",
      response.status,
      url,
      error
    );


    throw new Error(
      error
    );

  }


  return response;

}


/* =========================================================
   CATEGORIAS
========================================================= */

async function loadCategories() {

  const response =
    await supabaseRequest(
      "torre_categories?select=*&order=position.asc"
    );


  categories =
    await response.json();


  if (!categories.length) {

    throw new Error(
      "Não existem categorias no Supabase."
    );

  }

}


/* =========================================================
   MENU
========================================================= */

function renderCategoryMenu() {

  categoryMenu.innerHTML =
    "";


  categories.forEach(
    category => {

      const button =
        document.createElement(
          "button"
        );


      button.className =
        "category-button";


      button.textContent =
        category.name;


      button.addEventListener(
        "click",
        async function() {

          categoryMenu.classList.remove(
            "open"
          );


          await selectCategory(
            category
          );

        }
      );


      categoryMenu.appendChild(
        button
      );

    }
  );

}


/* =========================================================
   SELECCIONAR CATEGORIA
========================================================= */

async function selectCategory(
  category
) {

  currentCategory =
    category;


  categoryTitle.textContent =
    category.name;


  columns = [];

  rows = [];


  await loadColumns();

  await loadRows();

  await ensureRows();

  await render();

  await loadLogs();


  /*
    Pré-preencher a data
    de hoje no formulário.
  */

  setTodayAsDefaultDate();

}


/* =========================================================
   COLUNAS
========================================================= */

async function loadColumns() {

  const response =
    await supabaseRequest(

      `torre_columns?select=*` +
      `&category_id=eq.${currentCategory.id}` +
      `&order=position.asc`

    );


  columns =
    await response.json();


  if (!columns.length) {

    for (
      let i = 0;
      i < 6;
      i++
    ) {

      const response =
        await supabaseRequest(
          "torre_columns",
          {

            method:
              "POST",

            headers: {

              "Prefer":
                "return=representation"

            },

            body:
              JSON.stringify({

                category_id:
                  currentCategory.id,

                position:
                  i

              })

          }
        );


      const inserted =
        await response.json();


      columns.push(
        inserted[0]
      );

    }

  }

}


/* =========================================================
   LINHAS
========================================================= */

async function loadRows() {

  const response =
    await supabaseRequest(

      `torre_rows?select=*` +
      `&category_id=eq.${currentCategory.id}` +
      `&order=position.asc`

    );


  rows =
    await response.json();

}


/* =========================================================
   GARANTIR LINHAS
========================================================= */

async function ensureRows() {

  if (
    rows.length >= 20
  ) {

    return;

  }


  const missing =
    20 - rows.length;


  for (
    let i = 0;
    i < missing;
    i++
  ) {

    await createRow();

  }


  await loadRows();

}


/* =========================================================
   CRIAR LINHA
========================================================= */

async function createRow() {

  /*
    Encontrar o maior número
    de inventário desta categoria.
  */

  const existingNumbers =
    rows

      .map(
        row =>
          Number(
            row.inventory_number
          )
      )

      .filter(
        number =>
          Number.isFinite(number)
      );


  const highestNumber =
    existingNumbers.length
      ? Math.max(
          ...existingNumbers
        )
      : 0;


  const inventoryNumber =
    highestNumber + 1;


  const position =
    rows.length;


  const response =
    await supabaseRequest(

      "torre_rows",

      {

        method:
          "POST",

        headers: {

          "Prefer":
            "return=representation"

        },

        body:
          JSON.stringify({

            category_id:
              currentCategory.id,

            position,

            inventory_number:
              inventoryNumber

          })

      }

    );


  const inserted =
    await response.json();


  const row =
    inserted[0];


  rows.push(
    row
  );


  /*
    Criar células.
  */

  for (
    const column of columns
  ) {

    await supabaseRequest(

      "torre_cells",

      {

        method:
          "POST",

        body:
          JSON.stringify({

            row_id:
              row.id,

            column_id:
              column.id,

            value:
              null

          })

      }

    );

  }


  return row;

}


/* =========================================================
   CELULAS
========================================================= */

async function loadCells() {

  const response =
    await supabaseRequest(
      "torre_cells?select=*"
    );


  return await response.json();

}


/* =========================================================
   RENDER
========================================================= */

async function render() {

  const cells =
    await loadCells();


  grid.innerHTML =
    "";


  const cellMap =
    new Map();


  cells.forEach(
    cell => {

      cellMap.set(

        `${cell.row_id}-${cell.column_id}`,

        cell

      );

    }
  );


  rows.forEach(
    (
      row,
      rowIndex
    ) => {

      createRowElement(
        row,
        rowIndex,
        cellMap
      );

    }
  );

}


/* =========================================================
   CRIAR LINHA VISUAL
========================================================= */

function createRowElement(
  row,
  rowIndex,
  cellMap
) {

  const rowElement =
    document.createElement(
      "div"
    );


  rowElement.className =
    "archive-row";


  rowElement.style.setProperty(
    "--columns",
    columns.length
  );


  /*
    Número do inventário.
  */

  const number =
    document.createElement(
      "div"
    );


  number.className =
    "row-number";


  number.textContent =
    String(
      row.inventory_number
    ).padStart(
      3,
      "0"
    );


  rowElement.appendChild(
    number
  );


  /*
    Células.
  */

  columns.forEach(
    (
      column,
      columnIndex
    ) => {

      const cell =
        document.createElement(
          "div"
        );


      cell.className =
        "cell";


      const data =
        cellMap.get(
          `${row.id}-${column.id}`
        );


      /*
        PRIMEIRA COLUNA = IMAGEM
      */

      if (
        columnIndex === 0
      ) {

        cell.classList.add(
          "image-cell"
        );


        cell.contentEditable =
          "false";


        cell.tabIndex =
          0;


        cell.setAttribute(
          "role",
          "button"
        );


        if (
          data &&
          data.value
        ) {

          createImage(
            data.value,
            cell
          );

        } else {

          createImagePlaceholder(
            cell,
            row.id,
            column.id
          );

        }


        /*
          Paste
        */

        cell.addEventListener(
          "paste",
          function(event) {

            handleImagePaste(
              event,
              cell,
              row.id,
              column.id
            );

          }
        );


        /*
          Clique.
        */

        cell.addEventListener(
          "click",
          function(event) {

            const image =
              cell.querySelector(
                "img"
              );


            if (image) {

              openImage(
                image.src
              );

              return;

            }


            event.preventDefault();


            openFilePicker(
              row.id,
              column.id,
              cell
            );

          }
        );


      }


      /*
        RESTANTES COLUNAS = TEXTO
      */

      else {

        cell.contentEditable =
          "true";


        cell.textContent =
          data?.value || "";


        cell.addEventListener(
          "blur",
          async function() {

            await saveCell(

              row.id,

              column.id,

              cell.textContent

            );

          }
        );


        cell.addEventListener(
          "keydown",
          function(event) {

            if (
              event.key === "Enter"
            ) {

              event.preventDefault();

              cell.blur();

            }

          }
        );

      }


      rowElement.appendChild(
        cell
      );

    }
  );


  /*
    X da linha.
  */

  const deleteButton =
    document.createElement(
      "button"
    );


  deleteButton.className =
    "delete-row";


  deleteButton.textContent =
    "×";


  deleteButton.setAttribute(
    "aria-label",
    "Apagar linha"
  );


  deleteButton.addEventListener(
    "click",
    async function(event) {

      event.stopPropagation();


      const confirmed =
        confirm(
          "Apagar esta linha?"
        );


      if (!confirmed) {

        return;

      }


      await deleteRow(
        row.id
      );

    }
  );


  rowElement.appendChild(
    deleteButton
  );


  grid.appendChild(
    rowElement
  );

}


/* =========================================================
   PLACEHOLDER
========================================================= */

function createImagePlaceholder(
  cell,
  rowId,
  columnId
) {

  const placeholder =
    document.createElement(
      "div"
    );


  placeholder.className =
    "image-placeholder";


  placeholder.textContent =
    ">img<";


  placeholder.addEventListener(
    "click",
    function(event) {

      event.stopPropagation();


      openFilePicker(
        rowId,
        columnId,
        cell
      );

    }
  );


  cell.appendChild(
    placeholder
  );

}


/* =========================================================
   FILE PICKER
========================================================= */

function openFilePicker(
  rowId,
  columnId,
  cell
) {

  imageFileInput.dataset.rowId =
    rowId;


  imageFileInput.dataset.columnId =
    columnId;


  imageFileInput._targetCell =
    cell;


  imageFileInput.click();

}


imageFileInput.addEventListener(
  "change",
  async function() {

    const file =
      imageFileInput.files[0];


    if (!file) {

      return;

    }


    const rowId =
      imageFileInput.dataset.rowId;


    const columnId =
      imageFileInput.dataset.columnId;


    const cell =
      imageFileInput._targetCell;


    try {

      const optimized =
        await optimizeImage(
          file
        );


      const imageUrl =
        await uploadImage(
          optimized
        );


      await saveCell(

        rowId,

        columnId,

        imageUrl

      );


      createImage(
        imageUrl,
        cell
      );


    } catch (error) {

      console.error(
        error
      );


      alert(
        "Erro ao carregar a imagem."
      );

    }


    imageFileInput.value =
      "";

  }
);


/* =========================================================
   PASTE IMAGE
========================================================= */

async function handleImagePaste(
  event,
  cell,
  rowId,
  columnId
) {

  const items =
    event.clipboardData.items;


  for (
    const item of items
  ) {

    if (
      !item.type.startsWith(
        "image/"
      )
    ) {

      continue;

    }


    event.preventDefault();


    const file =
      item.getAsFile();


    if (!file) {

      return;

    }


    try {

      const optimized =
        await optimizeImage(
          file
        );


      const imageUrl =
        await uploadImage(
          optimized
        );


      await saveCell(

        rowId,

        columnId,

        imageUrl

      );


      createImage(
        imageUrl,
        cell
      );


    } catch (error) {

      console.error(
        error
      );


      alert(
        "Erro ao carregar a imagem."
      );

    }


    break;

  }

}


/* =========================================================
   CRIAR IMAGEM
========================================================= */

function createImage(
  src,
  cell
) {

  const image =
    document.createElement(
      "img"
    );


  image.src =
    src;


  image.alt =
    "Imagem";


  image.addEventListener(
    "click",
    function(event) {

      event.stopPropagation();


      openImage(
        image.src
      );

    }
  );


  cell.innerHTML =
    "";


  cell.appendChild(
    image
  );

}


/* =========================================================
   OPTIMIZE IMAGE
========================================================= */

function optimizeImage(
  file
) {

  return new Promise(
    (resolve, reject) => {

      const reader =
        new FileReader();


      reader.onload =
        function(event) {

          const image =
            new Image();


          image.onload =
            function() {

              let width =
                image.naturalWidth;


              let height =
                image.naturalHeight;


              const MAX_SIZE =
                2000;


              if (
                width > MAX_SIZE ||
                height > MAX_SIZE
              ) {

                const ratio =
                  Math.min(

                    MAX_SIZE / width,

                    MAX_SIZE / height

                  );


                width =
                  Math.round(
                    width * ratio
                  );


                height =
                  Math.round(
                    height * ratio
                  );

              }


              const canvas =
                document.createElement(
                  "canvas"
                );


              canvas.width =
                width;


              canvas.height =
                height;


              const context =
                canvas.getContext(
                  "2d"
                );


              context.drawImage(

                image,

                0,
                0,

                width,
                height

              );


              canvas.toBlob(

                function(blob) {

                  if (!blob) {

                    reject(
                      new Error(
                        "Erro ao comprimir"
                      )
                    );

                    return;

                  }


                  resolve(

                    new File(

                      [blob],

                      "torre.jpg",

                      {
                        type:
                          "image/jpeg"
                      }

                    )

                  );

                },

                "image/jpeg",

                0.85

              );

            };


          image.onerror =
            reject;


          image.src =
            event.target.result;

        };


      reader.onerror =
        reject;


      reader.readAsDataURL(
        file
      );

    }
  );

}


/* =========================================================
   UPLOAD IMAGE
========================================================= */

async function uploadImage(
  file
) {

  const filename =

    `${Date.now()}-` +

    `${Math.random()
      .toString(36)
      .substring(2)}.jpg`;


  const response =
    await fetch(

      `${SUPABASE_URL}` +
      `/storage/v1/object/` +
      `${BUCKET}/${filename}`,

      {

        method:
          "POST",

        headers: {

          "apikey":
            SUPABASE_KEY,

          "Authorization":
            `Bearer ${SUPABASE_KEY}`,

          "Content-Type":
            "image/jpeg"

        },

        body:
          file

      }

    );


  if (!response.ok) {

    const error =
      await response.text();


    console.error(
      error
    );


    throw new Error(
      "Upload falhou"
    );

  }


  return (

    `${SUPABASE_URL}` +
    `/storage/v1/object/public/` +
    `${BUCKET}/${filename}`

  );

}


/* =========================================================
   GUARDAR CELULA
========================================================= */

async function saveCell(
  rowId,
  columnId,
  value
) {

  await supabaseRequest(

    `torre_cells?` +
    `row_id=eq.${rowId}` +
    `&column_id=eq.${columnId}`,

    {

      method:
        "PATCH",

      headers: {

        "Prefer":
          "return=minimal"

      },

      body:
        JSON.stringify({
          value
        })

    }

  );

}


/* =========================================================
   APAGAR LINHA
========================================================= */

async function deleteRow(
  rowId
) {

  await supabaseRequest(

    `torre_rows?id=eq.${rowId}`,

    {
      method:
        "DELETE"
    }

  );


  rows =
    rows.filter(
      row =>
        row.id !== rowId
    );


  /*
    A posição visual é reorganizada,
    mas inventory_number NÃO muda.
  */

  for (
    let i = 0;
    i < rows.length;
    i++
  ) {

    await supabaseRequest(

      `torre_rows?id=eq.${rows[i].id}`,

      {

        method:
          "PATCH",

        headers: {

          "Prefer":
            "return=minimal"

        },

        body:
          JSON.stringify({

            position:
              i

          })

      }

    );

  }


  await loadRows();

  await render();

}


/* =========================================================
   ADICIONAR ROW
========================================================= */

addRowButton.addEventListener(
  "click",
  async function() {

    try {

      await createRow();

      await loadRows();

      await render();

    } catch (error) {

      console.error(
        error
      );


      alert(
        "Erro ao criar linha."
      );

    }

  }
);


/* =========================================================
   REMOVER ROW
========================================================= */

removeRowButton.addEventListener(
  "click",
  async function() {

    if (
      rows.length <= 1
    ) {

      alert(
        "É necessário manter pelo menos uma linha."
      );

      return;

    }


    const lastRow =
      rows[
        rows.length - 1
      ];


    const confirmed =
      confirm(
        "Apagar a última linha?"
      );


    if (!confirmed) {

      return;

    }


    await deleteRow(
      lastRow.id
    );

  }
);


/* =========================================================
   ADICIONAR COLUNA
========================================================= */

async function addColumn() {

  const position =
    columns.length;


  const response =
    await supabaseRequest(

      "torre_columns",

      {

        method:
          "POST",

        headers: {

          "Prefer":
            "return=representation"

        },

        body:
          JSON.stringify({

            category_id:
              currentCategory.id,

            position

          })

      }

    );


  const inserted =
    await response.json();


  const column =
    inserted[0];


  columns.push(
    column
  );


  for (
    const row of rows
  ) {

    await supabaseRequest(

      "torre_cells",

      {

        method:
          "POST",

        body:
          JSON.stringify({

            row_id:
              row.id,

            column_id:
              column.id,

            value:
              null

          })

      }

    );

  }


  await render();

}


/* =========================================================
   REMOVER COLUNA
========================================================= */

async function removeColumn() {

  if (
    columns.length <= 1
  ) {

    alert(
      "É necessário manter pelo menos uma coluna."
    );

    return;

  }


  const column =
    columns[
      columns.length - 1
    ];


  const confirmed =
    confirm(
      "Apagar a última coluna?"
    );


  if (!confirmed) {

    return;

  }


  await supabaseRequest(

    `torre_columns?id=eq.${column.id}`,

    {
      method:
        "DELETE"
    }

  );


  columns =
    columns.slice(
      0,
      -1
    );


  for (
    let i = 0;
    i < columns.length;
    i++
  ) {

    await supabaseRequest(

      `torre_columns?id=eq.${columns[i].id}`,

      {

        method:
          "PATCH",

        headers: {

          "Prefer":
            "return=minimal"

        },

        body:
          JSON.stringify({

            position:
              i

          })

      }

    );

  }


  await loadColumns();

  await render();

}


addColumnButton.addEventListener(
  "click",
  async function() {

    try {

      await addColumn();

    } catch (error) {

      console.error(
        error
      );


      alert(
        "Erro ao criar coluna."
      );

    }

  }
);


removeColumnButton.addEventListener(
  "click",
  async function() {

    try {

      await removeColumn();

    } catch (error) {

      console.error(
        error
      );


      alert(
        "Erro ao remover coluna."
      );

    }

  }
);


/* =========================================================
   MENU
========================================================= */

torreTitle.addEventListener(
  "click",
  function(event) {

    event.stopPropagation();


    categoryMenu.classList.toggle(
      "open"
    );

  }
);


document.addEventListener(
  "click",
  function(event) {

    if (
      !event.target.closest(
        "#menu-wrapper"
      )
    ) {

      categoryMenu.classList.remove(
        "open"
      );

    }

  }
);


/* =========================================================
   IMAGE VIEWER
========================================================= */

viewer.addEventListener(
  "click",
  function() {

    viewer.classList.remove(
      "open"
    );


    viewerImage.src =
      "";

  }
);


function openImage(src) {

  viewerImage.src =
    src;


  viewer.classList.add(
    "open"
  );

}


/* =========================================================
   LOG — DATA DE HOJE
========================================================= */

function setTodayAsDefaultDate() {

  const today =
    new Date();


  const year =
    today.getFullYear();


  const month =
    String(
      today.getMonth() + 1
    ).padStart(
      2,
      "0"
    );


  const day =
    String(
      today.getDate()
    ).padStart(
      2,
      "0"
    );


  logDate.value =
    `${year}-${month}-${day}`;

}


/* =========================================================
   LOG — CARREGAR
========================================================= */

async function loadLogs() {

  if (
    !currentCategory
  ) {

    return;

  }


  const response =
    await supabaseRequest(

      `torre_logs?select=*` +
      `&category_id=eq.${currentCategory.id}` +
      `&order=log_date.desc,created_at.desc`

    );


  const logs =
    await response.json();


  renderLogs(
    logs
  );

}


/* =========================================================
   LOG — RENDER
========================================================= */

function renderLogs(
  logs
) {

  logList.innerHTML =
    "";


  if (!logs.length) {

    const empty =
      document.createElement(
        "div"
      );


    empty.className =
      "log-entry";


    empty.textContent =
      "sem registos";


    logList.appendChild(
      empty
    );


    return;

  }


  logs.forEach(
    log => {

      const entry =
        document.createElement(
          "div"
        );


      entry.className =
        "log-entry";


      const meta =
        document.createElement(
          "div"
        );


      meta.className =
        "log-meta";


      const date =
        document.createElement(
          "span"
        );


      date.className =
        "log-date-display";


      date.textContent =
        formatDate(
          log.log_date
        );


      const number =
        document.createElement(
          "span"
        );


      number.className =
        "log-number-display";


      number.textContent =
        `#${String(
          log.inventory_number
        ).padStart(
          3,
          "0"
        )}`;


      meta.appendChild(
        date
      );


      meta.appendChild(
        number
      );


      const note =
        document.createElement(
          "div"
        );


      note.className =
        "log-note-display";


      note.textContent =
        log.note;


      entry.appendChild(
        meta
      );


      entry.appendChild(
        note
      );


      logList.appendChild(
        entry
      );

    }
  );

}


/* =========================================================
   FORMATAR DATA
========================================================= */

function formatDate(
  dateString
) {

  const parts =
    dateString.split(
      "-"
    );


  if (
    parts.length !== 3
  ) {

    return dateString;

  }


  return (
    `${parts[2]}.${parts[1]}.${parts[0]}`
  );

}


/* =========================================================
   CRIAR LOG
========================================================= */

logForm.addEventListener(
  "submit",
  async function(event) {

    event.preventDefault();


    const date =
      logDate.value;


    const number =
      Number(
        logNumber.value
      );


    const note =
      logNote.value.trim();


    /*
      Os três campos são obrigatórios.
    */

    if (
      !date ||
      !number ||
      !note
    ) {

      alert(
        "É obrigatório indicar a data, o número do inventário e a nota."
      );

      return;

    }


    /*
      Verificar se o número
      pertence a esta categoria.
    */

    const rowExists =
      rows.some(
        row =>
          Number(
            row.inventory_number
          ) === number
      );


    if (!rowExists) {

      alert(
        "Esse número de inventário não existe nesta categoria."
      );

      return;

    }


    try {

      await supabaseRequest(

        "torre_logs",

        {

          method:
            "POST",

          headers: {

            "Prefer":
              "return=representation"

          },

          body:
            JSON.stringify({

              category_id:
                currentCategory.id,

              inventory_number:
                number,

              log_date:
                date,

              note:
                note

            })

        }

      );


      /*
        Limpar apenas a nota.
      */

      logNote.value =
        "";


      logNumber.value =
        "";


      await loadLogs();

    } catch (error) {

      console.error(
        error
      );


      alert(
        "Erro ao guardar o log."
      );

    }

  }
);


/* =========================================================
   ABRIR / FECHAR CHAT
========================================================= */

toggleLog.addEventListener(
  "click",
  function() {

    logPanel.classList.toggle(
      "collapsed"
    );


    toggleLog.textContent =
      logPanel.classList.contains(
        "collapsed"
      )
        ? "+"
        : "−";

  }
);


/* =========================================================
   INICIALIZAÇÃO
========================================================= */

async function init() {

  try {

    await loadCategories();

    renderCategoryMenu();

    await selectCategory(
      categories[0]
    );


  } catch (error) {

    console.error(
      "TORRE ERROR:",
      error
    );


    document.body.innerHTML = `

      <div style="
        padding:40px;
        font-family:Arial, Helvetica, sans-serif;
        color:#ffffff;
        background:#0000ff;
        min-height:100vh;
      ">

        <h2>
          TORRE — erro
        </h2>

        <pre style="
          white-space:pre-wrap;
        ">${error.message}</pre>

      </div>

    `;

  }

}


init();
