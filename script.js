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

}


/* =========================================================
   CARREGAR COLUNAS
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
    Se não houver colunas,
    criar as 6 iniciais.
  */

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
   CARREGAR LINHAS
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
    Apenas para a primeira configuração
    de cada categoria, criamos 20 linhas.
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


  rows.push(
    row
  );


  /*
    Criar uma célula
    para cada coluna.
  */

  for (
    const column of columns
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


      /* =====================================================
         PRIMEIRA COLUNA = IMAGEM
      ===================================================== */

      if (
        columnIndex === 0
      ) {

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
          "Escolher imagem"
        );


        /*
          Se existe imagem,
          mostrar imagem.
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
          Se não existe imagem,
          mostrar >img<
        */

        else {

          createImagePlaceholder(
            cell,
            row.id,
            column.id
          );

        }


        /*
          Cmd+V / Ctrl+V
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
          Clique
        */

        cell.addEventListener(
          "click",
          function(event) {

            /*
              Se houver imagem,
              abrir imagem.
            */

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


            /*
              Se estiver vazia,
              abrir Finder.
            */

            event.preventDefault();


            openFilePicker(
              row.id,
              column.id,
              cell
            );

          }
        );


      }


      /* =====================================================
         RESTANTES COLUNAS = TEXTO
      ===================================================== */

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


  /* =====================================================
     X DA LINHA
  ===================================================== */

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


  /*
    O X fica fora da grelha.
  */

  rowElement.appendChild(
    deleteButton
  );


  grid.appendChild(
    rowElement
  );

}


/* =========================================================
   PLACEHOLDER >IMG<
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

  /*
    Guardamos temporariamente
    a célula onde a imagem
    deve aparecer.
  */

  imageFileInput.dataset.rowId =
    rowId;


  imageFileInput.dataset.columnId =
    columnId;


  imageFileInput._targetCell =
    cell;


  /*
    Isto abre o Finder.
  */

  imageFileInput.click();

}


/* =========================================================
   ESCOLHER IMAGEM DO FINDER
========================================================= */

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


    /*
      Permite escolher novamente
      o mesmo ficheiro.
    */

    imageFileInput.value = "";

  }
);


/* =========================================================
   PASTE IMAGEM
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


  cell.innerHTML = "";


  cell.appendChild(
    image
  );

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


  const url =

    `${SUPABASE_URL}` +

    `/storage/v1/object/` +

    `${BUCKET}/${filename}`;


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

    /*
      Não permitir apagar a última
      linha existente.
    */

    if (rows.length <= 1) {

      alert(
        "É necessário manter pelo menos uma linha."
      );

      return;

    }


    const lastRow =
      rows[rows.length - 1];


    const confirmed =
      confirm(
        "Apagar a última linha?"
      );


    if (!confirmed) {
      return;
    }


    try {

      await deleteRow(
        lastRow.id
      );

    } catch (error) {

      console.error(
        error
      );


      alert(
        "Erro ao remover linha."
      );

    }

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
    Criar células para
    todas as linhas.
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
   REMOVER COLUNA
========================================================= */

async function removeColumn() {

  /*
    Não permitir apagar
    todas as colunas.
  */

  if (columns.length <= 1) {

    alert(
      "É necessário manter pelo menos uma coluna."
    );

    return;

  }


  /*
    Removemos a última coluna.
  */

  const column =
    columns[columns.length - 1];


  const confirmed =
    confirm(
      "Apagar a última coluna?"
    );


  if (!confirmed) {
    return;
  }


  try {

    /*
      Como torre_cells tem
      ON DELETE CASCADE,
      as células associadas
      serão apagadas automaticamente.
    */

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


    /*
      Reorganizar posições.
    */

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

          body: JSON.stringify({

            position: i

          })

        }

      );

    }


    await loadColumns();

    await render();


  } catch (error) {

    console.error(
      error
    );


    alert(
      "Erro ao remover coluna."
    );

  }

}


/* =========================================================
   BOTÃO ADICIONAR COLUNA
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
   BOTÃO REMOVER COLUNA
========================================================= */

removeColumnButton.addEventListener(
  "click",
  async function() {

    await removeColumn();

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


    viewerImage.src = "";

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
   INICIALIZAÇÃO
========================================================= */

async function init() {

  try {

    await loadCategories();

    renderCategoryMenu();

    /*
      Começar em LIVROS,
      que deverá ser a primeira
      categoria.
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
