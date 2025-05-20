# Plano de Desenvolvimento: Gerenciador de Tarefas para TDAH

**Objetivo Principal:** Criar um aplicativo web minimalista com Flask e frontend simples (HTML, CSS, JS) para gerenciamento de tarefas, otimizado para usuários com TDAH, com foco em interface limpa, operação por teclado e um "Modo Execução".

---

### 1. Estrutura do Projeto

Proponho a seguinte estrutura de pastas e arquivos:

```
tarefas_foco_tdah/
├── app.py                   # Arquivo principal da aplicação Flask
├── static/
│   ├── css/
│   │   └── style.css        # Estilos principais
│   ├── js/
│   │   └── script.js        # Lógica do frontend
│   └── img/
│       └── focus_icon.svg   # Ícone para o Modo Execução (a ser criado)
├── templates/
│   └── index.html           # Template HTML principal
├── data/
│   └── tasks.json           # Arquivo para persistência de dados (JSON)
├── README.md                # Documentação do projeto e atalhos de teclado (separado do plano)
├── PLAN.md                  # Este arquivo de planejamento
└── .gitignore               # Arquivos a serem ignorados pelo Git
```

---

### 2. Backend (Flask - `app.py`)

*   **Linguagem:** Python
*   **Framework:** Flask
*   **Persistência de Dados:** Arquivo `data/tasks.json`

**Funcionalidades:**

1.  **Gerenciamento de Dados JSON:**
    *   Funções para ler e escrever no arquivo `tasks.json`.
    *   Estrutura do JSON para tarefas:
        ```json
        [
          {
            "id": "uuid_string_1",
            "title": "Título da Tarefa Principal",
            "description": "Descrição opcional.",
            "priority": 1, // 1-Alta, 2-Média, 3-Baixa
            "completed": false,
            "subtasks": [
              {
                "id": "uuid_string_sub_1",
                "title": "Subtarefa 1",
                "description": "",
                "completed": false
              }
            ]
          }
          // ... outras tarefas
        ]
        ```
2.  **Rotas da API (Endpoints):**
    *   `GET /tasks`: Retorna todas as tarefas ativas (não concluídas), ordenadas por prioridade e depois por ordem de criação/modificação.
    *   `GET /tasks/completed`: Retorna todas as tarefas concluídas.
    *   `POST /task`: Adiciona uma nova tarefa.
        *   Payload: `{ "title": "...", "description": "...", "priority": ... }`
    *   `PUT /task/<task_id>`: Edita uma tarefa existente (título, descrição, prioridade).
        *   Payload: `{ "title": "...", "description": "...", "priority": ... }`
    *   `DELETE /task/<task_id>`: Exclui uma tarefa.
    *   `POST /task/<task_id>/complete`: Marca uma tarefa como concluída.
    *   `POST /task/<task_id>/restore`: Restaura uma tarefa concluída para a lista ativa.
    *   `POST /task/<task_id>/subtask`: Adiciona uma nova subtarefa a uma tarefa existente.
        *   Payload: `{ "title": "...", "description": "..." }`
    *   `PUT /task/<task_id>/subtask/<subtask_id>`: Edita uma subtarefa.
        *   Payload: `{ "title": "...", "description": "..." }`
    *   `DELETE /task/<task_id>/subtask/<subtask_id>`: Exclui uma subtarefa.
    *   `POST /task/<task_id>/subtask/<subtask_id>/complete`: Marca uma subtarefa como concluída.
3.  **Lógica de Negócios:**
    *   Geração de IDs únicos para tarefas e subtarefas (ex: `uuid`).
    *   Validação de dados recebidos.
    *   Ordenação de tarefas por prioridade.

---

### 3. Frontend (HTML, CSS, JavaScript)

*   **HTML (`templates/index.html`):**
    *   Estrutura semântica e minimalista.
    *   Divisões principais: Lista de Tarefas Ativas, Lista de Tarefas Concluídas.
    *   Templates para renderização de tarefas e subtarefas.
    *   Local para o ícone do "Modo Execução".
*   **CSS (`static/css/style.css`):**
    *   **Paleta de Cores:** Tons pastéis suaves e calmantes.
        *   Prioridade 1 (Alta): Tom sutilmente mais destacado.
        *   Prioridade 2 (Média): Cor base ou tom neutro.
        *   Prioridade 3 (Baixa): Tom sutilmente menos destacado.
    *   **Tipografia:** Fonte sans-serif de alta legibilidade (ex: Open Sans, Lato, Inter).
    *   **Layout:** Limpo, com bom uso de espaço em branco.
    *   **Feedback Visual:** Transições suaves e sutis.
    *   **Subtarefas:** Design para expansão/recolhimento claro.
    *   **Modo Execução:** Indicação visual com ícone e/ou alteração sutil no tema.
*   **JavaScript (`static/js/script.js`):**
    *   Comunicação com API (`fetch`).
    *   Renderização dinâmica de tarefas.
    *   Manipulação de eventos de teclado para todas as funcionalidades.
    *   Gerenciamento do "Modo Execução".
    *   Validação de formulários (client-side básica).
    *   Implementação de feedback visual.

---

### 4. Atalhos de Teclado (a serem documentados em `README.md`)

*   **Navegação:**
    *   `Seta para Baixo`: Selecionar próxima tarefa/subtarefa.
    *   `Seta para Cima`: Selecionar tarefa/subtarefa anterior.
    *   `Tab` / `Shift + Tab`: Navegar entre elementos interativos.
*   **Ações em Tarefas:**
    *   `N` ou `A`: Adicionar nova tarefa (prioridade padrão).
    *   `Shift + 1`: Adicionar nova tarefa com Alta Prioridade.
    *   `Shift + 2`: Adicionar nova tarefa com Média Prioridade.
    *   `Shift + 3`: Adicionar nova tarefa com Baixa Prioridade.
    *   `Enter` (com tarefa selecionada): Editar tarefa.
    *   `Delete` ou `Backspace` (com tarefa selecionada): Excluir tarefa.
    *   `Espaço` (com tarefa selecionada): Marcar/desmarcar como concluída.
    *   `P` (com tarefa selecionada): Ciclar prioridade.
    *   `S` (com tarefa selecionada): Adicionar subtarefa.
    *   `Direita` (tarefa com subtarefas): Expandir subtarefas.
    *   `Esquerda` (tarefa com subtarefas): Recolher subtarefas.
*   **Modo Execução:**
    *   `F`: Ativar/Desativar Modo Execução.
*   **Visualização:**
    *   `Ctrl + Direita`: Alternar para Tarefas Concluídas.
    *   `Ctrl + Esquerda`: Alternar para Tarefas Ativas.
*   **Geral:**
    *   `Esc`: Fechar pop-ups, cancelar edição/adição.

---

### 5. Considerações Específicas para TDAH

*   Mínima distração visual.
*   Feedback imediato e sutil.
*   Clareza e consistência na interação.
*   "Modo Execução" para foco.
*   Priorização visualmente clara e suave.
*   Subtarefas expansíveis para não sobrecarregar a lista principal.

---

### 6. Diagrama da Arquitetura (Mermaid)

```mermaid
graph TD
    Usuario[👤 Usuário (Teclado)] -- Interage via Teclado --> Frontend[🌐 Frontend (HTML, CSS, JS)];
    Frontend -- Envia Requisições HTTP --> Backend[⚙️ Backend (Flask API)];
    Backend -- Lê/Escreve --> PersistenciaJSON[📄 data/tasks.json];
    Backend -- Retorna Respostas HTTP --> Frontend;
    Frontend -- Renderiza Interface --> Usuario;

    subgraph Frontend
        direction LR
        HTMLView[HTML: Estrutura]
        CSSView[CSS: Estilo e Cores TDAH]
        JSLogic[JS: Lógica, Atalhos, Modo Foco]
    end

    subgraph Backend
        direction LR
        RotasAPI[Rotas API (CRUD, etc.)]
        LogicaNegocio[Lógica de Negócios (Prioridade, IDs)]
        GerenciadorJSON[Gerenciador de tasks.json]
    end

    style Usuario fill:#D6EAF8,stroke:#333,stroke-width:2px
    style Frontend fill:#E8DAEF,stroke:#333,stroke-width:2px
    style Backend fill:#D5F5E3,stroke:#333,stroke-width:2px
    style PersistenciaJSON fill:#FCF3CF,stroke:#333,stroke-width:2px