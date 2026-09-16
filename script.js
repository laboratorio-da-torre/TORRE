const SUPABASE_URL = "COLOCA_AQUI_O_PROJECT_URL";
const SUPABASE_KEY = "COLOCA_AQUI_A_PUBLISHABLE_KEY";

const grid = document.getElementById("grid");
const addRowButton = document.getElementById("add-row");

const viewer = document.getElementById("image-viewer");
const viewerImage = document.getElementById("viewer-image");

const BUCKET = "images";

let rows = [];



/* =========================
   SUPABASE REQUEST
   ========================= */

async function supabaseRequest(
  endpoint,
  options = {}
) {

  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/${endpoint}`,
    {
      ...options,

      headers: {
        "apikey": SUPABASE_KEY,
        "Authorization": `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json",
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
   CARREGAR GRELHA
   ========================= */

async function loadRows() {

  try {

    const response =
      await supabaseRequest(
        "torre_rows?select=*&order=row_number.asc"
      );

    rows = await response.json();

    renderGrid();

  } catch (error) {

    console.error(
      "Erro ao carregar TORRE:",
      error
    );

  }

}



/* =========================
   DESENHAR GRELHA
   ========================= */

function renderGrid() {

  grid.innerHTML = "";



  /*
     Se ainda não existirem linhas,
     criar 20.
  */

  if (rows.length === 0) {

    for (let i = 0; i < 20; i++) {

      rows.push({
        row_number: i,
        image_url: null,
        text_1: "",
        text_2: "",
        text_3: "",
        text_4: "",
        text_5: ""
      });

    }

  }



  rows.forEach(
    (row, rowIndex) => {

      createRow(
        row,
        rowIndex
      );

    }
  );

}



/* =========================
   CRIAR LINHA
   ========================= */

function createRow(row, rowIndex) {

  /*
     PRIMEIRA COLUNA
     = IMAGEM
  */

  const imageCell =
    document.createElement("div");

  imageCell.className =
    "cell image-cell";

  imageCell.tabIndex = 0;



  /*
     Se já existir imagem
  */

  if (row.image_url) {

    createImage(
      row.image_url,
      imageCell
    );

  }



  /*
     Colar imagem
  */

  imageCell.addEventListener(
    "paste",
    function(event) {

      handleImagePaste(
        event,
        imageCell,
        row,
        rowIndex
      );

    }
  );



  /*
     Clicar na célula
  */

  imageCell.addEventListener(
    "click",
    function() {

      const image =
        imageCell.querySelector("img");

      if (image) {

        openImage(image.src);

      } else {

        imageCell.focus();

      }

    }
  );



  grid.appendChild(imageCell);



  /*
     OUTRAS 5 COLUNAS
  */

  for (
    let column = 1;
    column <= 5;
    column++
  ) {

    const cell =
      document.createElement("div");

    cell.className = "cell";

    cell.contentEditable = "true";



    const field =
      `text_${column}`;



    cell.textContent =
      row[field] || "";



    /*
       Guardar quando alterar
    */

    cell.addEventListener(
      "blur",
      async function() {

        await updateRow(
          row.id,
          {
            [field]:
              cell.textContent
          }
        );

      }
    );



    /*
       Enter não cria nova linha
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



    grid.appendChild(cell);

  }

}



/* =========================
   CRIAR IMAGEM
   ========================= */

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

  cell.appendChild(image);

}



/* =========================
   COLAR IMAGEM
   ========================= */

async function handleImagePaste(
  event,
  cell,
  row,
  rowIndex
) {

  const items =
    event.clipboardData.items;



  for (
    const item of items
  ) {

    if (
      item.type.startsWith("image/")
    ) {

      event.preventDefault();



      const file =
        item.getAsFile();



      if (!file) {
        return;
      }



      try {

        /*
           Comprimir primeiro.
        */

        const optimizedFile =
          await optimizeImage(file);



        /*
           Enviar para Supabase.
        */

        const imageUrl =
          await uploadImage(
            optimizedFile
          );



        /*
           Guardar URL na base de dados.
        */

        await updateRow(
          row.id,
          {
            image_url: imageUrl
          }
        );



        /*
           Mostrar imediatamente.
        */

        createImage(
          imageUrl,
          cell
        );



        /*
           Atualizar memória local.
        */

        row.image_url =
          imageUrl;



      } catch (error) {

        console.error(error);

        alert(
          "Não foi possível carregar a imagem."
        );

      }



      break;

    }

  }

}



/* =========================
   OTIMIZAR IMAGEM
   ========================= */

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
                 Lado máximo:
                 2000px
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
                canvas.getContext("2d");



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
                        "Erro ao comprimir imagem"
                      )
                    );

                    return;

                  }



                  const optimizedFile =
                    new File(
                      [blob],
                      "torre-image.jpg",
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



      reader.readAsDataURL(file);

    }
  );

}



/* =========================
   UPLOAD PARA SUPABASE
   ========================= */

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
            "image/jpeg",

          "x-upsert":
            "false"

        },

        body: file

      }
    );



  if (!response.ok) {

    const error =
      await response.text();

    console.error(error);

    throw new Error(
      "Erro no upload da imagem"
    );

  }



  /*
     URL pública
  */

  return (
    `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${filename}`
  );

}



/* =========================
   ATUALIZAR LINHA
   ========================= */

async function updateRow(
  id,
  data
) {

  if (!id) {

    console.warn(
      "Linha ainda não tem ID."
    );

    return;

  }



  await supabaseRequest(
    `torre_rows?id=eq.${id}`,
    {
      method: "PATCH",

      headers: {
        "Prefer":
          "return=minimal"
      },

      body:
        JSON.stringify(data)
    }
  );

}



/* =========================
   ADICIONAR NOVA LINHA
   ========================= */

async function addRow() {

  const rowNumber =
    rows.length;



  const newRow = {

    row_number:
      rowNumber,

    image_url:
      null,

    text_1:
      "",

    text_2:
      "",

    text_3:
      "",

    text_4:
      "",

    text_5:
      ""

  };



  try {

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
            JSON.stringify(newRow)
        }
      );



    const inserted =
      await response.json();



    rows.push(
      inserted[0]
    );



    renderGrid();



  } catch (error) {

    console.error(error);

    alert(
      "Não foi possível adicionar a linha."
    );

  }

}



/* =========================
   ZOOM
   ========================= */

function openImage(src) {

  viewerImage.src =
    src;

  viewer.style.display =
    "flex";

}



function closeImage() {

  viewer.style.display =
    "none";

  viewerImage.src =
    "";

}



viewer.addEventListener(
  "click",
  function() {

    closeImage();

  }
);



/* =========================
   BOTÃO +
   ========================= */

addRowButton.addEventListener(
  "click",
  addRow
);



/* =========================
   COMEÇAR
   ========================= */

loadRows();
