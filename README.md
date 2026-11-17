# Oficina Virtual 2D

Oficina virtual sencilla en 2D para ejecutar en el navegador. Permite mover un avatar con las flechas del teclado (o WASD) y escribir mensajes de chat que se muestran en pantalla y como burbuja sobre cada avatar.

Soporta hasta **4 jugadores simultáneos**.

## Tecnologías

- **Frontend:** Phaser 3 + Socket.io-client (por CDN)
- **Backend:** Node.js + Express + Socket.io
- **Estilo:** CSS puro

## Requisitos

- [Node.js](https://nodejs.org/) (v16 o superior recomendado)

## Instalación y ejecución local

```bash
# 1. Entrar a la carpeta del proyecto
cd oficina-virtual-2d

# 2. Instalar dependencias (solo del servidor)
npm install

# 3. Iniciar el servidor
npm start
```

Luego abre tu navegador en:

```
http://localhost:3000
```

Puedes abrir varias pestañas o navegadores para simular varios usuarios (máximo 4).

## Controles

| Tecla | Acción |
|-------|--------|
| Flechas / WASD | Mover tu avatar |
| Enter | Enviar mensaje de chat |

## Subir a GitHub

Desde la carpeta del proyecto:

```bash
git init
git add .
git commit -m "Versión inicial: oficina virtual 2D con movimiento y chat"
```

En [GitHub](https://github.com), crea un repositorio nuevo (sin inicializarlo con README para evitar conflictos). Luego enlázalo y sube el código:

```bash
git remote add origin https://github.com/TU-USUARIO/TU-REPOSITORIO.git
git branch -M main
git push -u origin main
```

Sustituye `TU-USUARIO` y `TU-REPOSITORIO` por tus datos.

## Estructura del proyecto

```
oficina-virtual-2d/
├── server.js           # Servidor Node.js + Socket.io
├── package.json        # Dependencias y scripts
├── .gitignore          # Archivos ignorados por git
├── README.md           # Este archivo
└── public/
    ├── index.html      # Interfaz del navegador
    ├── style.css       # Estilos
    └── client.js       # Lógica del cliente (Phaser 3)
```

## Próximas mejoras sugeridas

- Añadir paredes y colisiones (muebles, oficinas)
- Salas de reuniones privadas (videollamada por proximidad)
- Avatares con imágenes personalizadas
- Guardar posiciones en una base de datos
- Desplegar en Render, Railway o Fly.io
