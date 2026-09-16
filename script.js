const SUPABASE_URL =
  "https://rvfdobjhfwjdvufwrirp.supabase.co/rest/v1/";

const SUPABASE_KEY =
  "sb_publishable_aXh2UjT79AHJpjRXLVZeKA_UCRE96LL";

const BUCKET = "images";


const grid = document.getElementById("grid");

const addRowButton =
  document.getElementById("add-row");

const addColumnButton =
  document.getElementById("add-column");

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


let categories = [];
let columns = [];
let rows = [];

let currentCategory = null;


/* ---------------------------
   SUPABASE
---------------------------- */

async function supabaseRequest(endpoint, options = {}) {

  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/${endpoint}`,
    {
      ...options,

      headers: {
        "apikey": SUPABASE_KEY,

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

    console.error(error);

    throw new Error(error);
  }


  return response;
}


/* ---------------------------
   CATEGORIES
---------------------------- */

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

  categoryMenu.innerHTML = "";


  categories.forEach(category => {

    const button =
      document.createElement("button");

    button.className =
      "category-button";

    button.textContent =
      category.name;


    button.addEventListener(
      "click",
      async function() {

        categoryMenu
          .classList
          .remove("open");

        await selectCategory(category);
      }
    );


    categoryMenu.appendChild(button);
  });
}


/* ---------------------------
   CATEGORY SELECTION
---------------------------- */

async function selectCategory(category) {

  currentCategory = category;

  categoryTitle.textContent =
    category.name;


  await loadColumns();

  await loadRows();

  await ensureRows();

  await render();
}


/* ---------------------------
   COLUMNS
---------------------------- */

async function loadColumns() {

  const response =
    await supabaseRequest(
      `torre_columns?select=*&category_id=eq.${currentCategory.id}&order=position.asc`
    );

  columns =
    await response.json();


  /*
    Se a categoria ainda não tem
    colunas, cria 6.
  */

  if (!columns.length) {

    for (let i = 0; i < 6; i++) {

      const response =
        await supabaseRequest(
          "torre_columns",
          {
            method: "POST",

            headers: {
              "Prefer":
                "return=representation"
            },

            body: JSON.stringify({
              category_id:
                currentCategory.id,

              position: i
            })
          }
        );


      const inserted =
        await response.json();

      columns.push(inserted[0]);
    }
  }
}


/* ---------------------------
   ROWS
---------------------------- */

async function loadRows() {

  const response =
    await supabaseRequest(
      `torre_rows?select=*&category_id=eq.${currentCategory.id}&order=position.asc`
    );

  rows =
    await response.json();
}


async function ensureRows() {

  if (rows.length >= 20) {
    return;
  }


  const missing =
    20 - rows.length;


  for (let i = 0; i < missing; i++) {

    await createRow();
  }


  await loadRows();
}


async function createRow() {

  const position =
    rows.length;


  const response =
    await supabaseRequest(
      "torre_rows",
      {
        method: "POST",

        headers: {
          "Prefer":
            "return=representation"
        },

        body: JSON.stringify({

          category_id:
            currentCategory.id,

          position
        })
      }
    );


  const inserted =
    await response.json();

  const row =
    inserted[0];


  rows.push(row);


  for (const column of columns) {

    await supabaseRequest(
      "torre_cells",
      {
        method: "POST",

        body: JSON.stringify({

          row_id:
            row.id,

          column_id:
            column.id,

          value: null
        })
      }
    );
  }


  return row;
}


/* ---------------------------
   CELLS
---------------------------- */

async function loadCells() {

  const response =
    await supabaseRequest(
      "torre_cells?select=*"
    );

  return await response.json();
}


/* ---------------------------
   RENDER
---------------------------- */

async function render() {

  const cells =
    await loadCells();


  grid.innerHTML = "";


  const cellMap =
    new Map();


  cells.forEach(cell => {

    cellMap.set(
      `${cell.row_id}-${cell.column_id}`,
      cell
    );
  });


  rows.forEach(
    (row, rowIndex) => {

      createRowElement(
        row,
        rowIndex,
        cellMap
      );
    }
  );
}


function createRowElement(
  row,
  rowIndex,
  cellMap
) {

  const rowElement =
    document.createElement("div");

  rowElement.className =
    "archive-row";


  rowElement.style.setProperty(
    "--columns",
    columns.length
  );


  columns.forEach(
    (column, columnIndex) => {

      const cell =
        document.createElement("div");

      cell.className =
        "cell";


      const data =
        cellMap.get(
          `${row.id}-${column.id}`
        );


      /* PRIMEIRA COLUNA = IMAGEM */

      if (columnIndex === 0) {

        cell.classList.add(
          "image-cell"
        );

        cell.tabIndex = 0;


        if (
          data &&
          data.value
        ) {

          createImage(
            data.value,
            cell
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
          function() {

            const image =
              cell.querySelector("img");


            if (image) {

              openImage(
                image.src
              );

            } else {

              cell.focus();
            }
          }
        );


      } else {

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


      rowElement.appendChild(cell);
    }
  );


  /* BOTÃO X */

  const deleteButton =
    document.createElement("button");

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


      await deleteRow(row.id);
    }
  );


  rowElement.appendChild(
    deleteButton
  );


  grid.appendChild(
    rowElement
  );
}


/* ---------------------------
   SAVE CELL
---------------------------- */

async function saveCell(
  rowId,
  columnId,
  value
) {

  await supabaseRequest(
    `torre_cells?row_id=eq.${rowId}&column_id=eq.${columnId}`,
    {
      method: "PATCH",

      headers: {
        "Prefer":
          "return=minimal"
      },

      body: JSON.stringify({
        value
      })
    }
  );
}


/* ---------------------------
   IMAGES
---------------------------- */

function createImage(
  src,
  cell
) {

  const image =
    document.createElement("img");


  image.src = src;

  image.alt = "Imagem";


  image.addEventListener(
    "click",
    function(event) {

      event.stopPropagation();

      openImage(
        image.src
      );
    }
  );


  cell.innerHTML = "";

  cell.appendChild(
    image
  );
}


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

      console.error(error);

      alert(
        "Erro ao carregar a imagem."
      );
    }


    break;
  }
}


function optimizeImage(file) {

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


async function uploadImage(file) {

  const filename =
    `${Date.now()}-${Math.random()
      .toString(36)
      .substring(2)}.jpg`;


  const response =
    await fetch(
      `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${filename}`,
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

        body: file
      }
    );


  if (!response.ok) {

    const error =
      await response.text();

    console.error(error);

    throw new Error(
      "Upload falhou"
    );
  }


  return (
    `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${filename}`
  );
}


/* ---------------------------
   DELETE ROW
---------------------------- */

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

        body: JSON.stringify({
          position: i
        })
      }
    );
  }


  await loadRows();

  await render();
}


/* ---------------------------
   ADD COLUMN
---------------------------- */

async function addColumn() {

  const position =
    columns.length;


  const response =
    await supabaseRequest(
      "torre_columns",
      {
        method: "POST",

        headers: {
          "Prefer":
            "return=representation"
        },

        body: JSON.stringify({

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
        method: "POST",

        body: JSON.stringify({

          row_id:
            row.id,

          column_id:
            column.id,

          value: null
        })
      }
    );
  }


  await render();
}


/* ---------------------------
   BUTTONS
---------------------------- */

addRowButton.addEventListener(
  "click",
  async function() {

    await createRow();

    await loadRows();

    await render();
  }
);


addColumnButton.addEventListener(
  "click",
  async function() {

    await addColumn();
  }
);


/* ---------------------------
   MENU
---------------------------- */

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


/* ---------------------------
   IMAGE VIEWER
---------------------------- */

viewer.addEventListener(
  "click",
  function() {

    viewer.classList.remove(
      "open"
    );

    viewerImage.src = "";
  }
);


function openImage(src) {

  viewerImage.src = src;

  viewer.classList.add(
    "open"
  );
}


/* ---------------------------
   INIT
---------------------------- */

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
        font-family:Arial;
        color:white;
        background:#0000ff;
      ">
        <h2>TORRE — erro</h2>
        <pre>${error.message}</pre>
      </div>
    `;
  }
}


init();
