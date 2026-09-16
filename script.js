const SUPABASE_URL = "https://rvfdobjhfwjdvufwrirp.supabase.co";
const SUPABASE_KEY = "sb_publishable_aXh2UjT79AHJpjRXLVZeKA_UCRE96LL";
const BUCKET = "images";
/* =========================================================
   GOOGLE SHEETS
========================================================= */

const GOOGLE_SHEETS_URL =
  "https://docs.google.com/spreadsheets/d/1FO_BRYjuPgpVs3tVaeioE1YjDGEBtgrS5776_Q9-12I/edit?gid=1510436497#gid=1510436497";


/* =========================================================
   ELEMENTOS
========================================================= */

const grid =
  document.getElementById("archive");

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
  document.getElementById("menu-button");

const categoryMenu =
  document.getElementById("menu");

const categoryTitle =
  document.getElementById("category-title");

const imageFileInput =
  document.getElementById("image-file-input");

const logPanel =
  document.getElementById("logs-section");

const logList =
  document.getElementById("logs");

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

const sheetsLink =
  document.getElementById("sheets-link");


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
                  i,

                width_px:
                  180
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

  columns =
    columns.map(
      column => ({
        ...column,

        width_px:
          Number(
            column.width_px
          ) || 180
      })
    );
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
          Number.isFinite(
            number
          )
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
   CELLS
========================================================= */

async function loadCells() {

  const response =
    await supabaseRequest(
      "torre_cells?select=*"
    );

  return await response.json();
}


/* =========================================================
   APPLY COLUMN WIDTHS
========================================================= */

function applyColumnWidths() {

  const template =
    columns
      .map(
        column =>
          `${column.width_px || 180}px`
      )
      .join(" ");


  document
    .querySelectorAll(".archive-row")
    .forEach(
      rowElement => {

        rowElement.style.gridTemplateColumns =
          template;
      }
    );
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


  applyColumnWidths();
}


/* =========================================================
   ROW ELEMENT
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


  /*
   * Larguras das colunas
   */

  rowElement.style.gridTemplateColumns =
    columns
      .map(
        column =>
          `${column.width_px || 180}px`
      )
      .join(" ");


  /*
   * Número
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
   * Colunas
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
       * PRIMEIRA COLUNA = IMAGEM
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


      } else {

        /*
         * TEXTO
         */

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


      /*
       * Resize handle
       *
       * O handle fica apenas na
       * primeira linha para não
       * criar vários separadores.
       */

      if (
        rowIndex === 0 &&
        columnIndex <
          columns.length - 1
      ) {

        createResizeHandle(
          cell,
          column
        );
      }


      rowElement.appendChild(
        cell
      );
    }
  );


  /*
   * APAGAR LINHA
   *
   * Fica fora da grid através
   * de position:absolute no CSS.
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
   RESIZE COLUMN
========================================================= */

function createResizeHandle(
  cell,
  column
) {

  const handle =
    document.createElement(
      "div"
    );

  handle.className =
    "column-resize-handle";


  cell.appendChild(
    handle
  );


  let startX = 0;

  let startWidth = 0;


  handle.addEventListener(
    "pointerdown",
    function(event) {

      event.preventDefault();

      event.stopPropagation();


      startX =
        event.clientX;


      startWidth =
        Number(
          column.width_px
        ) ||
        cell.getBoundingClientRect()
          .width;


      handle.classList.add(
        "dragging"
      );


      handle.setPointerCapture(
        event.pointerId
      );


      function move(
        moveEvent
      ) {

        const delta =
          moveEvent.clientX -
          startX;


        const newWidth =
          Math.max(
            80,
            Math.round(
              startWidth +
              delta
            )
          );


        column.width_px =
          newWidth;


        applyColumnWidths();
      }


      async function end() {

        handle.classList.remove(
          "dragging"
        );


        handle.removeEventListener(
          "pointermove",
          move
        );

        handle.removeEventListener(
          "pointerup",
          end
        );


        try {

          await supabaseRequest(
            `torre_columns?id=eq.${column.id}`,

            {
              method:
                "PATCH",

              headers: {
                "Prefer":
                  "return=minimal"
              },

              body:
                JSON.stringify({
                  width_px:
                    column.width_px
                })
            }
          );

        } catch (error) {

          console.error(
            error
          );
        }
      }


      handle.addEventListener(
        "pointermove",
        move
      );

      handle.addEventListener(
        "pointerup",
        end
      );
    }
  );
}


/* =========================================================
   IMAGE PLACEHOLDER
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
   IMAGE
========================================================= */

function createImage(
  src,
  cell
) {

  /*
   * Guardar o separador antes
   * de limpar a célula.
   */

  const resizeHandle =
    cell.querySelector(
      ".column-resize-handle"
    );


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


  /*
   * Voltar a colocar o
   * separador da coluna.
   */

  if (resizeHandle) {

    cell.appendChild(
      resizeHandle
    );
  }
}


/* =========================================================
   IMAGE OPTIMIZATION
========================================================= */

function optimizeImage(
  file
) {

  return new Promise(
    (
      resolve,
      reject
    ) => {

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
   SAVE CELL
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
   DELETE ROW
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
   ADD ROW
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
   REMOVE ROW
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
   ADD COLUMN
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

            position,

            width_px:
              180
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
   REMOVE COLUMN
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


/* =========================================================
   COLUMN BUTTONS
========================================================= */

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
        "#header"
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


function openImage(
  src
) {

  viewerImage.src =
    src;

  viewer.classList.add(
    "open"
  );
}


/* =========================================================
   LOG DATE
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
   LOAD LOGS
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
   RENDER LOGS
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


      /*
       * DELETE LOG
       */

      const deleteButton =
        document.createElement(
          "button"
        );

      deleteButton.className =
        "delete-log";

      deleteButton.textContent =
        "×";

      deleteButton.setAttribute(
        "aria-label",
        "Apagar nota"
      );


      deleteButton.addEventListener(
        "click",
        async function() {

          const confirmed =
            confirm(
              "Apagar esta nota?"
            );


          if (!confirmed) {
            return;
          }


          try {

            await supabaseRequest(
              `torre_logs?id=eq.${log.id}`,
              {
                method:
                  "DELETE"
              }
            );


            await loadLogs();

          } catch (error) {

            console.error(
              error
            );

            alert(
              "Erro ao apagar a nota."
            );
          }
        }
      );


      entry.appendChild(
        meta
      );

      entry.appendChild(
        note
      );

      entry.appendChild(
        deleteButton
      );


      logList.appendChild(
        entry
      );
    }
  );
}


/* =========================================================
   FORMAT DATE
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
    `${parts[2]}.` +
    `${parts[1]}.` +
    `${parts[0]}`
  );
}


/* =========================================================
   SAVE LOG
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
   TOGGLE LOG
========================================================= */

if (toggleLog) {

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
}


/* =========================================================
   GOOGLE SHEETS LINK
========================================================= */

sheetsLink.href =
  GOOGLE_SHEETS_URL;


/* =========================================================
   INIT
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
