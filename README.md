```md
# TicketFix AI

Plataforma web de soporte técnico conversacional que clasifica tickets automáticamente y guía al usuario con soluciones paso a paso.

## Características

- Clasificación de tickets por categoría y prioridad mediante TensorFlow.js.
- Modelo entrenado con un dataset propio de 480 ejemplos.
- Diagnóstico conversacional con un modelo local de Ollama (Qwen 2.5).
- Playbooks de solución para problemas de red, hardware, software y periféricos.
- Detección de pasos repetidos para evitar recomendaciones redundantes.
- Escalamiento automático a soporte humano cuando el caso no se resuelve.
- Control de sesiones y registro de tickets cerrados.

## Tecnologías

- JavaScript
- Node.js
- Express
- TensorFlow.js
- Ollama / Qwen 2.5
- HTML5 y CSS3

## Instalación

1. Clona el repositorio:

   ```bash
   git clone https://github.com/esdrasbasurto6-afk/ticketfix-ai.git
   cd ticketfix-ai
   ```

2. Instala las dependencias:

   ```bash
   npm install
   ```

3. Instala y ejecuta Ollama con el modelo Qwen 2.5:

   ```bash
   ollama pull qwen2.5
   ollama serve
   ```

4. Crea un archivo `.env` a partir de `.env.example`:

   ```env
   PORT=3000
   OLLAMA_URL=http://127.0.0.1:11434
   OLLAMA_MODEL=qwen2.5
   ```

5. Inicia el proyecto:

   ```bash
   npm start
   ```

6. Abre en el navegador:

   ```text
   http://localhost:3000
   ```

## Uso

Describe un problema técnico, por ejemplo:

> “Mi laptop Windows no tiene conexión a internet”.

TicketFix AI clasificará el caso, mostrará su prioridad y ofrecerá instrucciones de solución. Si el problema continúa después de los intentos disponibles, el sistema lo escala a soporte técnico.

## Autor

**Esdras Josué Basurto Sandoval**  
[GitHub](https://github.com/esdrasbasurto6-afk)
```
