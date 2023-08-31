const readline = require("readline");
const sqlite3 = require("sqlite3").verbose();
const fs = require("fs");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const db = new sqlite3.Database("preguntas.db");

let lastSelectedOption = null;

// Crear tabla si no existe
db.run(`
  CREATE TABLE IF NOT EXISTS preguntas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    btn TEXT,
    text TEXT,
    respuesta TEXT,
    codigo TEXT,
    videos TEXT
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS pasos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pregunta_id INTEGER,
    paso TEXT
  )
`);

const data = [
  "javascript",
  "nodejs",
  "react",
  "hackers",
  "virus",
  "security",
  "art",
  "construction",
  "predictions",
];

function displayMainMenu() {
  console.log("\n");
  console.log("Seleccione una opción:");
  console.log("1. Seleccionar Dropdown");
  console.log("2. Agregar pregunta");
  console.log("3. Crear archivo JSON");

  rl.question("Opción: ", (choice) => {
    console.log("\n");
    switch (choice) {
      case "1":
        displayDataMenu(data); // Pasar la variable 'data' como argumento
        break;
      case "2":
        agregarPreguntaMenu();
        break;
      case "3":
        createJSONFile();
        break;
      default:
        console.log("Opción inválida.");
        displayMainMenu();
        break;
    }
  });
}

function displayDataMenu(data) {
  // Recibir 'data' como parámetro
  console.log("Seleccione una opción:");
  for (let i = 0; i < data.length; i++) {
    console.log(`${i + 1}. ${data[i]}`);
  }

  rl.question("Opción: ", (choiceIndex) => {
    console.log("\n");
    const index = parseInt(choiceIndex.trim()) - 1;

    if (!isNaN(index) && index >= 0 && index < data.length) {
      const selectedOption = data[index];
      lastSelectedOption = selectedOption;
      console.log(`Ha seleccionado: ${selectedOption}`);
      displayMainMenu();
    } else {
      console.log("Opción inválida.");
      displayDataMenu(data); // Pasar 'data' como argumento
    }
  });
}

function agregarPreguntaMenu() {
  if (lastSelectedOption) {
    console.log(`Opción seleccionada anteriormente: ${lastSelectedOption}`);
    agregarPregunta(lastSelectedOption);
  } else {
    console.log("No se ha seleccionado una opción.");
    displayMainMenu();
  }
}
function agregarPregunta(btn) {
  rl.question("Texto de la pregunta: ", (text) => {
    rl.question("Respuesta de la pregunta: ", (respuesta) => {
      rl.question("Código relacionado (si lo hay): ", (codigo) => {
        rl.question("Videos relacionados (si los hay): ", (videos) => {
          rl.question("¿Cuántos pasos desea agregar? ", (numPasos) => {
            const pasosArray = [];
            // Insertar la pregunta en la tabla 'preguntas'
            db.run(
              "INSERT INTO preguntas (btn, text, respuesta, codigo, videos) VALUES (?, ?, ?, ?, ?)",
              [btn, text, respuesta, codigo, videos],
              function (err) {
                if (err) {
                  return console.error(err.message);
                }
                const preguntaId = this.lastID; // Obtener el ID de la pregunta recién insertada
                // Llamar a la función para agregar pasos
                agregarPasos(preguntaId, parseInt(numPasos), pasosArray);
              }
            );
          });
        });
      });
    });
  });
}

function agregarPasos(preguntaId, numPasos, pasosArray) {
  if (numPasos <= 0) {
    insertarPreguntaConPasos(preguntaId, pasosArray);
    return;
  }

  rl.question(`Paso ${numPasos}: `, (paso) => {
    pasosArray.push(paso.trim());
    agregarPasos(preguntaId, numPasos - 1, pasosArray);
  });
}

function insertarPreguntaConPasos(preguntaId, pasosArray) {
  // Insertar los pasos en la tabla 'pasos' utilizando el ID de la pregunta
  const pasosData = pasosArray.map((paso) => [preguntaId, paso]);
  const insertPasos = db.prepare(
    "INSERT INTO pasos (pregunta_id, paso) VALUES (?, ?)"
  );
  pasosData.forEach((pasoData) => insertPasos.run(pasoData));

  insertPasos.finalize(() => {
    console.log(`Pregunta con pasos agregada con ID: ${preguntaId}`);
    displayMainMenu();
  });
}

function createJSONFile() {
  if (lastSelectedOption) {
    db.all(
      "SELECT * FROM preguntas WHERE btn = ?",
      [lastSelectedOption],
      (err, preguntas) => {
        if (err) {
          console.error("Error al consultar la base de datos:", err);
        } else {
          db.all("SELECT pregunta_id, paso FROM pasos", (err, pasos) => {
            if (err) {
              console.error("Error al consultar la base de datos:", err);
              return;
            }

            const preguntasConPasos = preguntas.map((pregunta) => {
              const pasosRelacionados = pasos
                .filter((paso) => paso.pregunta_id === pregunta.id)
                .map((paso) => paso.paso);
              return {
                texto: pregunta.text,
                respuesta: pregunta.respuesta,
                codigo: pregunta.codigo,
                videos: pregunta.videos ? pregunta.videos.split(",") : [],
                pasos: pasosRelacionados,
              };
            });

            const jsonData = {
              btn: lastSelectedOption,
              preguntas: preguntasConPasos,
            };

            fs.writeFile(
              "data.json",
              JSON.stringify(jsonData, null, 2),
              (err) => {
                if (err) {
                  console.error("Error al crear el archivo JSON:", err);
                } else {
                  console.log("Archivo JSON 'data.json' creado exitosamente.");
                }
                displayMainMenu();
              }
            );
          });
        }
      }
    );
  } else {
    console.log("No se ha seleccionado una opción.");
    displayMainMenu();
  }
}

displayMainMenu();
