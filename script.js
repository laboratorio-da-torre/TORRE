/* =========================================================
   SUPABASE
========================================================= */

const SUPABASE_URL =
  "https://rvfdobjhfwjdvufwrirp.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_aXh2Uj79AHJpjRXLVZeKA_UCRE96LL";

const BUCKET =
  "images";


/* =========================================================
   GOOGLE SHEETS
========================================================= */

const GOOGLE_SHEETS_URL =
  "https://docs.google.com/spreadsheets/d/1FO_BRYjuPgpVs3tVaeioE1YjDGEBtgrS5776_Q9-12I/edit?gid=1510436497#gid=1510436497";


/* =========================================================
   ELEMENTOS
========================================================= */

const menuButton =
  document.getElementById("menu-button");

const menu =
  document.getElementById("menu");

const archive =
  document.getElementById("archive");

const addRowButton =
  document.getElementById("add-row");

const removeRowButton =
  document.getElementById("remove-row");

const addColumnButton =
  document.getElementById("add-column");

const removeColumnButton =
  document.getElementById("remove-column");

const categoryTitle =
  document.getElementById("category-title");

const imageFileInput =
  document.getElementById("image-file-input");

const viewer =
  document.getElementById("image-viewer");

const viewerImage =
  document.getElementById("viewer-image");

const logs =
  document.getElementById("logs");

const logDate =
  document.getElementById("log-date");

const logNumber =
  document.getElementById("log-number");

const logNote =
  document.getElementById("log-note");

const saveLogButton =
  document.getElementById("save-log");

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
   SUPABASE
========================================================= */

async function supabaseRequest(
  endpoint,
  options = {}
) {

  const response =
    await fetch(
      `${SUPABASE_URL}/rest/v1/${endpoint}`,
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
      "SUPABASE ERROR:",
      response.status,
      error
    );

    throw new Error(error);
  }


  return response;
}


/* =========================================================
   CATEGORIES
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

  menu.innerHTML = "";


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
        async function(event) {

          event.stopPropagation();

          menu.classList.remove(
            "open"
          );

          await selectCategory(
            category
          );
        }
      );


      menu.appendChild(
        button
      );
    }
  );
}


/* =========================================================
   SELECT CATEGORY
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
   LOAD COLUMNS
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
            method: "POST",

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


  let total =
    columns.reduce(
      (sum, column) =>
        sum +
        (
          Number(
            column.width_px
          ) || 180
        ),
      0
    );


  if (!total) {
    total = 1;
  }


  columns =
    columns.map(
      column => ({

        ...column,

        width_percent:
          (
            (
              Number(
                column.width_px
              ) || 180
            ) /
            total
          ) *
          100
      })
    );
}


/* =========================================================
   GRID TEMPLATE
========================================================= */

function getGridTemplate() {

  /*
   * A primeira coluna é sempre a coluna
   * fixa do número de inventário.
   *
   * As restantes colunas correspondem
   * às colunas existentes no Supabase.
   */

  return [
    "58px",
    ...columns.map(
      column =>
        `${column.width_percent}%`
    )
  ].join(" ");
}


/* =========================================================
   APPLY GRID
========================================================= */

function applyGridTemplate() {

  const template =
    getGridTemplate();


  document
    .querySelectorAll(
      ".archive-row"
    )
    .forEach(
      row => {

        row.style.setProperty(
          "--grid-columns",
          template
        );
      }
    );
}


/* =========================================================
   LOAD ROWS
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
   ENSURE ROWS
========================================================= */

async function ensureRows() {

  if (
    rows.length >= 20
  ) {
    return;
  }


  const missing =
    20 -
    rows.length;


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
   CREATE ROW
========================================================= */

async function createRow() {

  const numbers =
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


  const highest =
    numbers.length
      ? Math.max(
          ...numbers
        )
      : 0;


  const inventoryNumber =
    highest + 1;


  const response =
    await supabaseRequest(
      "torre_rows",
      {
        method: "POST",

        headers: {
          "Prefer":
            "return=representation"
        },

        body:
          JSON.stringify({

            category_id:
              currentCategory.id,

            position:
              rows.length,

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
        method: "POST",

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
   LOAD CELLS
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


  archive.innerHTML =
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


  const template =
    getGridTemplate();


  /*
   * CABEÇALHO
   */

  createHeaderRow(
    template
  );


  /*
   * LINHAS DE INVENTÁRIO
   */

  rows.forEach(
    (row, rowIndex) => {

      createRowElement(
        row,
        rowIndex,
        cellMap,
        template
      );
    }
  );


  applyGridTemplate();
}


/* =========================================================
   HEADER ROW
========================================================= */

function createHeaderRow(
  template
) {

  const header =
    document.createElement(
      "div"
    );


  header.className =
    "archive-row archive-header";


  header.style.setProperty(
    "--grid-columns",
    template
  );


  /*
   * NÚMERO
   */

  const numberHeader =
    document.createElement(
      "div"
    );


  numberHeader.className =
    "cell number-column header-cell";


  numberHeader.textContent =
    "nº";


  header.appendChild(
    numberHeader
  );


  /*
   * COLUNAS
   */

  columns.forEach(
    (column, index) => {

      const cell =
        document.createElement(
          "div"
        );


      cell.className =
        "cell header-cell";


      cell.textContent =
        `coluna ${index + 1}`;


      /*
       * Handle de resize
       */

      if (
        index <
        columns.length - 1
      ) {

        createResizeHandle(
          cell,
          index
        );
      }


      header.appendChild(
        cell
      );
    }
  );


  /*
   * Espaço para o botão de apagar
   */

  const spacer =
    document.createElement(
      "div"
    );


  spacer.className =
    "header-delete-spacer";


  header.appendChild(
    spacer
  );


  archive.appendChild(
    header
  );
}


/* =========================================================
   ROW ELEMENT
========================================================= */

function createRowElement(
  row,
  rowIndex,
  cellMap,
  template
) {

  const rowElement =
    document.createElement(
      "div"
    );


  rowElement.className =
    "archive-row";


  rowElement.style.setProperty(
    "--grid-columns",
    template
  );


  /*
   * NÚMERO DE INVENTÁRIO
   */

  const number =
    document.createElement(
      "div"
    );


  number.className =
    "cell number-column";


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
   * CELLS
   */

  columns.forEach(
    (column, columnIndex) => {

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
       * IMAGEM
       */

      if (
        columnIndex === 0
      ) {

        cell.classList.add(
          "image-cell"
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

            try {

              await saveCell(
                row.id,
                column.id,
                cell.textContent
              );

            } catch (error) {

              console.error(
                error
              );
            }
          }
        );


        cell.addEventListener(
          "keydown",
          function(event) {

            if (
              event.key ===
              "Enter"
            ) {

              event.preventDefault();

              cell.blur();
            }
          }
        );
      }


      /*
       * RESIZE
       *
       * O handle fica no cabeçalho,
       * não se repete em todas as linhas.
       */


      rowElement.appendChild(
        cell
      );
    }
  );


  /*
   * DELETE
   */

  const deleteButton =
    document.createElement(
      "button"
    );


  deleteButton.className =
    "delete-row";


  deleteButton.type =
    "button";


  deleteButton.textContent =
    "×";


  deleteButton.addEventListener(
    "click",
    async function(event) {

      event.preventDefault();

      event.stopPropagation();


      if (
        !confirm(
          "Apagar esta linha?"
        )
      ) {
        return;
      }


      try {

        await deleteRow(
          row.id
        );

      } catch (error) {

        console.error(
          error
        );

        alert(
          "Erro ao apagar a linha."
        );
      }
    }
  );


  rowElement.appendChild(
    deleteButton
  );


  archive.appendChild(
    rowElement
  );
}


/* =========================================================
   RESIZE
========================================================= */

function createResizeHandle(
  cell,
  columnIndex
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
  let startLeft = 0;
  let startRight = 0;


  handle.addEventListener(
    "pointerdown",
    function(event) {

      event.preventDefault();

      event.stopPropagation();


      const width =
        archive.getBoundingClientRect()
          .width;


      startX =
        event.clientX;


      startLeft =
        columns[
          columnIndex
        ].width_percent;


      startRight =
        columns[
          columnIndex + 1
        ].width_percent;


      handle.classList.add(
        "dragging"
      );


      function move(
        moveEvent
      ) {

        const deltaPx =
          moveEvent.clientX -
          startX;


        const deltaPercent =
          (
            deltaPx /
            width
          ) *
          100;


        let left =
          startLeft +
          deltaPercent;


        let right =
          startRight -
          deltaPercent;


        const minimum =
          8;


        if (
          left < minimum
        ) {

          left =
            minimum;

          right =
            startLeft +
            startRight -
            minimum;
        }


        if (
          right < minimum
        ) {

          right =
            minimum;

          left =
            startLeft +
            startRight -
            minimum;
        }


        columns[
          columnIndex
        ].width_percent =
          left;


        columns[
          columnIndex + 1
        ].width_percent =
          right;


        applyGridTemplate();
      }


      function end() {

        handle.classList.remove(
          "dragging"
        );


        document.removeEventListener(
          "pointermove",
          move
        );


        document.removeEventListener(
          "pointerup",
          end
        );


        saveColumnWidths();
      }


      document.addEventListener(
        "pointermove",
        move
      );


      document.addEventListener(
        "pointerup",
        end
      );
    }
  );
}


/* =========================================================
   SAVE COLUMN WIDTHS
========================================================= */

async function saveColumnWidths() {

  const reference =
    700;


  for (
    const column of columns
  ) {

    const width =
      Math.round(
        reference *
        (
          column.width_percent /
          100
        )
      );


    try {

      await supabaseRequest(
        `torre_columns?id=eq.${column.id}`,
        {
          method: "PATCH",

          headers: {
            "Prefer":
              "return=minimal"
          },

          body:
            JSON.stringify({
              width_px:
                width
            })
        }
      );

    } catch (error) {

      console.error(
        "Erro ao guardar largura:",
        error
      );
    }
  }
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
   IMAGE OPTIMIZATION
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
                        "Erro ao comprimir imagem."
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
   UPLOAD
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
        method: "POST",

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
      "Upload falhou."
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
      method: "PATCH",

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
      method: "DELETE"
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
        method: "PATCH",

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


    const row =
      rows[
        rows.length - 1
      ];


    if (
      !confirm(
        "Apagar a última linha?"
      )
    ) {
      return;
    }


    try {

      await deleteRow(
        row.id
      );

    } catch (error) {

      console.error(
        error
      );

      alert(
        "Erro ao apagar a linha."
      );
    }
  }
);


/* =========================================================
   ADD COLUMN
========================================================= */

async function addColumn() {

  const response =
    await supabaseRequest(
      "torre_columns",
      {
        method: "POST",

        headers: {
          "Prefer":
            "return=representation"
        },

        body:
          JSON.stringify({

            category_id:
              currentCategory.id,

            position:
              columns.length,

            width_px:
              180
          })
      }
    );


  const inserted =
    await response.json();


  const newColumn =
    inserted[0];


  columns.push(
    newColumn
  );


  const equal =
    100 /
    columns.length;


  columns.forEach(
    column => {

      column.width_percent =
        equal;
    }
  );


  for (
    const row of rows
  ) {

    await supabaseRequest(
      "torre_cells",
      {
        method: "POST",

        body:
          JSON.stringify({

            row_id:
              row.id,

            column_id:
              newColumn.id,

            value:
              null
          })
      }
    );
  }


  await saveColumnWidths();

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


  if (
    !confirm(
      "Apagar a última coluna?"
    )
  ) {
    return;
  }


  await supabaseRequest(
    `torre_columns?id=eq.${column.id}`,
    {
      method: "DELETE"
    }
  );


  columns =
    columns.slice(
      0,
      -1
    );


  const equal =
    100 /
    columns.length;


  columns.forEach(
    column => {

      column.width_percent =
        equal;
    }
  );


  for (
    let i = 0;
    i < columns.length;
    i++
  ) {

    await supabaseRequest(
      `torre_columns?id=eq.${columns[i].id}`,
      {
        method: "PATCH",

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


  await saveColumnWidths();

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

menuButton.addEventListener(
  "click",
  function(event) {

    event.stopPropagation();

    menu.classList.toggle(
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

      menu.classList.remove(
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
   DATE
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


  const data =
    await response.json();


  renderLogs(
    data
  );
}


/* =========================================================
   RENDER LOGS
========================================================= */

function renderLogs(
  data
) {

  logs.innerHTML =
    "";


  if (
    !data.length
  ) {

    const empty =
      document.createElement(
        "div"
      );


    empty.className =
      "log-entry";


    empty.textContent =
      "sem registos";


    logs.appendChild(
      empty
    );


    return;
  }


  data.forEach(
    log => {

      const entry =
        document.createElement(
          "div"
        );


      entry.className =
        "log-entry";


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


      const note =
        document.createElement(
          "div"
        );


      note.className =
        "log-note-display";


      note.textContent =
        log.note;


      const deleteButton =
        document.createElement(
          "button"
        );


      deleteButton.className =
        "delete-log";


      deleteButton.type =
        "button";


      deleteButton.textContent =
        "×";


      deleteButton.addEventListener(
        "click",
        async function() {

          if (
            !confirm(
              "Apagar esta nota?"
            )
          ) {
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
        date
      );

      entry.appendChild(
        number
      );

      entry.appendChild(
        note
      );

      entry.appendChild(
        deleteButton
      );


      logs.appendChild(
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

async function saveLog() {

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


  if (
    !rowExists
  ) {

    alert(
      "Esse número de inventário não existe nesta categoria."
    );

    return;
  }


  try {

    saveLogButton.disabled =
      true;


    await supabaseRequest(
      "torre_logs",
      {
        method: "POST",

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
     * Limpa os campos de número e nota,
     * mas mantém a data.
     */

    logNumber.value =
      "";

    logNote.value =
      "";


    /*
     * Recarrega imediatamente o LOG.
     */

    await loadLogs();

  } catch (error) {

    console.error(
      "LOG ERROR:",
      error
    );

    alert(
      "Erro ao guardar a nota."
    );

  } finally {

    saveLogButton.disabled =
      false;
  }
}


/*
 * O botão é usado directamente.
 *
 * Isto substitui o antigo evento
 * "submit" num elemento <div>.
 */

saveLogButton.addEventListener(
  "click",
  saveLog
);


/*
 * Enter no campo da nota também
 * permite adicionar o LOG.
 */

logNote.addEventListener(
  "keydown",
  function(event) {

    if (
      event.key === "Enter" &&
      !event.shiftKey
    ) {

      event.preventDefault();

      saveLog();
    }
  }
);


/* =========================================================
   GOOGLE SHEETS
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
        <h2>TORRE — erro</h2>

        <pre style="
          white-space:pre-wrap;
        ">${error.message}</pre>
      </div>
    `;
  }
}


init();
