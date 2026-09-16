const SUPABASE_URL =
  "COLOCA_AQUI_O_PROJECT_URL";

const SUPABASE_KEY =
  "COLOCA_AQUI_A_PUBLISHABLE_KEY";


const BUCKET =
  "images";


const grid =
  document.getElementById("grid");

const addRowButton =
  document.getElementById("add-row");

const addColumnButton =
  document.getElementById("add-column");

const viewer =
  document.getElementById("image-viewer");

const viewerImage =
  document.getElementById("viewer-image");


let columns = [];

let rows = [];



/* =========================
   SUPABASE
   ========================= */

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

    console.error(error);

    throw new Error(error);

  }


  return response;

}



/* =========================
   CARREGAR COLUNAS
   ========================= */

async function loadColumns() {

  const response =
    await supabaseRequest(
      "torre_columns?select=*&order=position.asc"
    );


  columns =
    await response.json();


}



/* =========================
   CARREGAR ROWS
   ========================= */

async function loadRows() {

  const response =
    await supabaseRequest(
      "torre_rows?select=*&order=position.asc"
    );


  rows =
    await response.json();

}



/* =========================
   GARANTIR 20 ROWS
   ========================= */

async function ensureRows() {

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



/* =========================
   CRIAR ROW
   ========================= */

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

        body:
          JSON.stringify({
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
     Criar células para
     todas as colunas.
  */

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



/* =========================
   CARREGAR CÉLULAS
   ========================= */

async function loadCells() {

  const response =
    await supabaseRequest(
      "torre_cells?select=*"
    );


  return await response.json();

}



/* =========================
   DESENHAR TUDO
   ========================= */

async function render() {

  const cells =
    await loadCells();


  grid.innerHTML =
    "";


  grid.style
    .setProperty(
      "--columns",
      columns.length
    );


  /*
     Criar um mapa rápido.
  */

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
    (row, rowIndex) => {

      createRowElement(
        row,
        rowIndex,
        cellMap
      );

    }
  );

}



/* =========================
   CRIAR ROW VISUAL
   ========================= */

function createRowElement(
  row,
  rowIndex,
  cellMap
) {

  const rowElement =
    document.createElement("div");


  rowElement.className =
    "archive-row";


  rowElement.style
    .setProperty(
      "--columns",
      columns.length
    );


  /*
     Células.
  */

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


      /*
         Primeira coluna =
         imagem
      */

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

        /*
           Texto.
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


      rowElement.appendChild(
        cell
      );

    }
  );


  /*
     BOTÃO X
     FICA FORA DAS COLUNAS
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



/* =========================
   GUARDAR CÉLULA
   ========================= */

async function saveCell(
  rowId,
  columnId,
  value
) {

  const response =
    await supabaseRequest(
      `torre_cells?row_id=eq.${rowId}&column_id=eq.${columnId}`,
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


  return response;

}



/* =========================
   IMAGEM
   ========================= */

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



/* =========================
   PASTE
   ========================= */

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


    } catch(error) {

      console.error(error);

      alert(
        "Erro ao carregar a imagem."
      );

    }


    break;

  }

}



/* =========================
   COMPRIMIR IMAGEM
   ========================= */

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



/* =========================
   UPLOAD
   ========================= */

async function uploadImage(
  file
) {

  const filename =
    `${Date.now()}-${Math.random()
      .toString(36)
      .substring(2)}.jpg`;


  const response =
    await fetch(
      `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${filename}`,
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

    console.error(error);

    throw new Error(
      "Upload falhou"
    );

  }


  return (
    `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${filename}`
  );

}



/* =========================
   APAGAR ROW
   ========================= */

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
     Reordenar posições.
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
            position: i
          })

      }
    );

  }


  await loadRows();

  await render();

}



/* =========================
   NOVA COLUNA
   ========================= */

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
     Criar uma célula vazia
     em cada row.
  */

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



/* =========================
   NOVA ROW
   ========================= */

addRowButton.addEventListener(
  "click",
  async function() {

    await createRow();

    await loadRows();

    await render();

  }
);



/* =========================
   NOVA COLUNA
   ========================= */

addColumnButton.addEventListener(
  "click",
  async function() {

    await addColumn();

  }
);



/* =========================
   FECHAR ZOOM
   ========================= */

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



/* =========================
   ABRIR ZOOM
   ========================= */

function openImage(src) {

  viewerImage.src =
    src;

  viewer.classList.add(
    "open"
  );

}



/* =========================
   INICIALIZAÇÃO
   ========================= */

async function init() {

  try {

    await loadColumns();

    await loadRows();

    await ensureRows();

    await render();

  } catch(error) {

    console.error(error);

    alert(
      "Não foi possível ligar ao TORRE."
    );

  }

}


init();
