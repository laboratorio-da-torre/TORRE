/* =========================================================
   SUPABASE
========================================================= */

const SUPABASE_URL =
  "https://rvfdobjhfwjdvufwrirp.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_aXh2UjT79AHJpjRXLVZeKA_UCRE96LL";

const BUCKET = "images";


/* =========================================================
   ELEMENTOS
========================================================= */

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

async function supabaseRequest(endpoint, options = {}) {

  const url =
    `${SUPABASE_URL}/rest/v1/${endpoint}`;

  console.log("TORRE REQUEST:", url);

  const response = await fetch(url, {

    ...options,

    headers: {

      "apikey": SUPABASE_KEY,

      "Authorization":
        `Bearer ${SUPABASE_KEY}`,

      "Content-Type":
        "application/json",

      ...(options.headers || {})

    }

  });


  if (!response.ok) {

    const error =
      await response.text();

    console.error(
      "TORRE SUPABASE ERROR:",
      response.status,
      url,
      error
    );

    throw new Error(error);
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

        categoryMenu.classList.remove(
          "open"
        );

        await selectCategory(category);

      }
    );


    categoryMenu.appendChild(button);

  });

}


/* =========================================================
   SELECCIONAR CATEGORIA
========================================================= */

async function selectCategory(category) {

  currentCategory = category;


  categoryTitle.textContent =
    category.name;


  columns = [];
  rows = [];


  await loadColumns();

  await loadRows();

  await ensureRows();

  await render();

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


  /*
    Se a categoria ainda não tiver
    colunas, criamos as 6 iniciais.
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

  /*
    Mantemos 20 linhas disponíveis
    em cada categoria.
  */

  if (rows.length >= 20) {
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


  /*
    Criar uma célula para
    cada coluna da categoria.
  */

  for (const column of columns) {

    await supabaseRequest(

      "torre_cells",

      {
        method: "POST",

        body: JSON.stringify({

          row_id: row.id,

          column_id:
            column.id,

          value: null

        })
      }

    );

  }


  return row;

}


/* =========================================================
   CARREGAR CELULAS
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


/* =========================================================
   CRIAR ELEMENTO DA LINHA
========================================================= */

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


      /* =====================================
         PRIMEIRA COLUNA = IMAGEM
      ===================================== */

      if (columnIndex === 0) {

        cell.classList.add(
          "image-cell"
        );


        cell.contentEditable =
          "false";


        cell.tabIndex = 0;


        cell.setAttribute(
          "role",
          "button"
        );


        cell.setAttribute(
          "aria-label",
          "Colar imagem"
        );


        /*
          Se já existir uma imagem,
          mostramos a imagem.
        */

        if (
          data &&
          data.value
        ) {

          createImage(
            data.value,
            cell
          );

        }


        /*
          COLAR IMAGEM
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
          Clique na célula
        */

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


      }

      /* =====================================
         RESTANTES COLUNAS = TEXTO
      ===================================== */

      else {

        cell.contentEditable =
          "true";


        cell.textContent =
          data?.value || "";


        /*
          Guardar texto quando
          saímos da célula.
        */

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


        /*
          Enter termina a edição
        */

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


  /* =====================================
     BOTÃO APAGAR LINHA
  ===================================== */

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


      await deleteRow(
        row.id
      );

    }
  );


  /*
    IMPORTANTE:
    este botão fica fora
    das colunas do grid.
  */

  rowElement.appendChild(
    deleteButton
  );


  grid.appendChild(
    rowElement
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


/* =========================================================
   CRIAR IMAGEM
========================================================= */

function createImage(
  src,
  cell
) {

  const image =
    document.createElement("img");


  image.src = src;


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


  cell.innerHTML = "";


  cell.appendChild(
    image
  );

}


/* =========================================================
   PASTE DE IMAGEM
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

      /*
        Comprimir antes
        do upload.
      */

      const optimized =
        await optimizeImage(
          file
        );


      /*
        Upload para
        Supabase Storage.
      */

      const imageUrl =
        await uploadImage(
          optimized
        );


      /*
        Guardar URL
        na célula.
      */

      await saveCell(
        rowId,
        columnId,
        imageUrl
      );


      /*
        Mostrar imediatamente.
      */

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
   OTIMIZAR IMAGEM
========================================================= */

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


              /*
                Máximo:
                2000 px no lado maior.
              */

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


                  const optimizedFile =
                    new File(

                      [blob],

                      "torre.jpg",

                      {
                        type:
                          "image/jpeg"
                      }

                    );


                  resolve(
                    optimizedFile
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
   UPLOAD SUPABASE STORAGE
========================================================= */

async function uploadImage(file) {

  const filename =

    `${Date.now()}-` +

    `${Math.random()
      .toString(36)
      .substring(2)}.jpg`;


  const url =

    `${SUPABASE_URL}` +

    `/storage/v1/object/` +

    `${BUCKET}/${filename}`;


  console.log(
    "TORRE IMAGE UPLOAD:",
    url
  );


  const response =
    await fetch(

      url,

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


    console.error(
      "TORRE STORAGE ERROR:",
      response.status,
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
   APAGAR LINHA
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


  /*
    Reorganizar posições.
  */

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


  /*
    Criar uma célula
    nova em todas as linhas.
  */

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


/* =========================================================
   BOTÃO +
   NOVA LINHA
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
   BOTÃO + COLUMN
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


/* =========================================================
   ABRIR MENU
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


/* =========================================================
   FECHAR MENU
========================================================= */

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
   FECHAR IMAGE VIEWER
========================================================= */

viewer.addEventListener(
  "click",
  function() {

    viewer.classList.remove(
      "open"
    );

    viewerImage.src = "";

  }
);


/* =========================================================
   ABRIR IMAGE VIEWER
========================================================= */

function openImage(src) {

  viewerImage.src =
    src;


  viewer.classList.add(
    "open"
  );

}


/* =========================================================
   INICIALIZAÇÃO
========================================================= */

async function init() {

  try {

    await loadCategories();

    renderCategoryMenu();

    /*
      Começar na primeira categoria:
      LIVROS.
    */

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
