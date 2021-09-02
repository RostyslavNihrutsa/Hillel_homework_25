class TodoListModel {
    baseURL = 'https://todo.hillel.it';
    token = null;

    constructor(view) {
        this.data = [];
        this.view = view;
    }

    async authorization(login, password) {

        const response = await fetch(`${this.baseURL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ value: login + password })
        });

        await response.json().then(result => {
            this.token = result.access_token;
            localStorage.setItem('Token', this.token);
        });
    }

    async getNotes() {
        const response = await fetch(`${this.baseURL}/todo`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.token}`
            },
        });
        const notes = await response.json();

        this.data = await notes.map(note => ({ value: note.value, id: note._id, isComplete: note.checked }));
    }

    async addNote(text, priority) {
        const defaultPriority = 1;
        if (!this.#isUniqueNote(text)) {
            throw new Error('The value must be unique!');
        }
        const response = await fetch(`${this.baseURL}/todo`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${this.token}`
            },
            body: JSON.stringify({ value: text, priority: priority || defaultPriority })
        });

        let note = await response.json();

        note = {
            value: note.value,
            isComplete: note.checked,
            id: note._id
        };

        if (note.value && this.#isUniqueNote(text)) {
            this.data.push(note);
            return note;
        }
    }

    async remove(id) {
        await fetch(`${this.baseURL}/todo/${id}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.token}`
            },
        });

        this.data = this.data.filter(item => item.id !== id);
    }

    async update(id, text, priority) {
        const defaultPriority = 1;
        if (this.#isUniqueNote({ value: text })) {
            this.data = this.data.map(item => item.id !== Number(id) ? item : { ...item, ...{ value: text } });

            await fetch(`${this.baseURL}/todo/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                body: JSON.stringify({ value: text, priority: priority || defaultPriority })
            });

        } else {
            throw new Error('The value must be unique!');
        }
    }

    async toggleComplete(id) {
        fetch(`${this.baseURL}/todo/${id}/toggle`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.token}`
            },

        });

        this.data = this.data.map(item => item.id !== id ? item : { ...item, isComplete: !item.isComplete });
    }

    get statistic() {
        return this.data.reduce((prev, item) => {
            prev.total++;
            if (item.isReady) {
                prev.Completed++;
            } else {
                prev.notCompleted++;
            }
            return prev;
        }, { total: 0, Completed: 0, notCompleted: 0 });
    }

    #isUniqueNote(text) {
        return !this.data.find(item => item.text === text);
    }
}

class TodoListView {
    list = document.querySelector('.todo__list');

    constructor(model) {
        this.model = model;
    }

    showAllNotes() {
        this.list.innerHTML = '';
        const fragment = new DocumentFragment();
        this.model.data.forEach((note) => {
            const li = document.createElement('li');
            note.isComplete ? li.className = 'todo__item todo__item_completed' : li.className = 'todo__item';
            li.dataset.id = note.id;
            const template = `
            <input type = "checkbox" class="todo__checkbox" ${note.isComplete ? 'checked' : ''}>
                <p class="todo__text">${note.value}</p>
                <div class="todo__btns">
                    <button class="todo__btn-remove">Видалити</button>
                    <button class="todo__btn-change">Змінити</button>
                </div>`;

            li.innerHTML = template;
            if (note.isComplete) {
                fragment.append(li);
            } else {
                fragment.prepend(li);
            }
        });
        this.list.append(fragment);
    }

    showFormToChange(id) {
        const objNote = this.model.data.find(item => item.id === Number(id));
        const item = this.list.querySelector(`.todo__item[data-id='${id}']`);
        const checked = objNote.isComplete ? 'checked' : '';
        const template = `
        <input type="checkbox" class="todo__checkbox" ${checked} disabled>
        <form class='todo__change-form'>
            <input class='todo__change-input' type="text" name="text" id="" value='${objNote.value}'>    
        </form>
            <div class="todo__btns">
                <button class="todo__btn-apply">Підтвердити</button>
                <button class="todo__btn-undo">Відмінити</button>
            </div>`;
        item.innerHTML = template;
    }

    applyChange(id) {
        const objNote = this.model.data.find(item => item.id === Number(id));
        const item = this.list.querySelector(`.todo__item[data-id='${id}']`);
        const newText = item.querySelector('.todo__change-input').value;
        const checked = objNote.isComplete ? 'checked' : '';
        const template = `
        <input type = "checkbox" class="todo__checkbox" ${checked}>
                <p class="todo__text">${newText}</p>
                <div class="todo__btns">
                    <button class="todo__btn-remove">Видалити</button>
                    <button class="todo__btn-change">Змінити</button>
                </div>`;
        item.innerHTML = template;
    }

    undoChange(id) {
        const objNote = this.model.data.find(item => item.id === Number(id));
        const item = this.list.querySelector(`.todo__item[data-id='${id}']`);
        const checked = objNote.isComplete ? 'checked' : '';
        const template = `
        <input type = "checkbox" class="todo__checkbox" ${checked}>
                <p class="todo__text">${objNote.value}</p>
                <div class="todo__btns">
                    <button class="todo__btn-remove">Видалити</button>
                    <button class="todo__btn-change">Змінити</button>
                </div>`;
        item.innerHTML = template;
    }

    showCompletedNote(id) {
        const item = this.list.querySelector(`.todo__item[data-id='${id}']`);
        item.classList.toggle('todo__item_completed');
        item.classList.contains('todo__item_completed') ? this.list.append(item) : this.list.prepend(item);
    }

    addToList(objNote) {
        const li = document.createElement('li');
        objNote.isComplete ? li.className = 'todo__item todo__item_completed' : li.className = 'todo__item';
        li.dataset.id = objNote.id;
        const checked = objNote.isComplete ? 'checked' : '';

        const template = `
            <input type = "checkbox" class="todo__checkbox" ${checked}>
                <p class="todo__text">${objNote.value}</p>
                <div class="todo__btns">
                    <button class="todo__btn-remove">Видалити</button>
                    <button class="todo__btn-change">Змінити</button>
                </div>`;

        li.innerHTML = template;
        if (objNote.isComplete) {
            this.list.append(li);
        } else {
            this.list.prepend(li);
        }
    }

    removeFromList(id) {
        this.list.querySelector(`.todo__item[data-id= '${id}']`).remove();
    }
}

class TodoListControler {
    formAdd = document.querySelector('.todo__input-form');
    formAuth = document.querySelector('.todo__auth-form');

    list = document.querySelector('.todo__list');

    constructor() {
        this.model = new TodoListModel();
        this.view = new TodoListView(this.model);

        this.initFormAddListener();
        this.initFormAuthListener();
        this.initListListener();
    }

    initFormAddListener() {
        this.formAdd.style.display = 'none';
        this.formAdd.addEventListener('submit', async (e) => {
            e.preventDefault();

            const formData = new FormData(e.target);

            const [text] = [...formData.values()];

            if (text.trim()) {
                this.model.addNote(text).then((result) => {
                    if (result) {
                        this.view.addToList(result);
                        e.target.reset();
                    }
                });
            }
        });
    }

    initFormAuthListener() {
        this.formAuth.addEventListener('submit', async (e) => {
            e.preventDefault();

            const formData = new FormData(e.target);

            const [login, password] = [...formData.values()];

            if (login.trim() && password.trim()) {
                this.formAdd.style.display = '';
                this.formAuth.style.display = 'none';
                this.model.authorization(login, password)
                    .then(() => this.model.getNotes())
                    .then(() => this.view.showAllNotes());
            }
        });
    }

    initListListener() {
        this.list.addEventListener('click', (e) => {

            if (!e.target.closest('.todo__item')) {
                return;
            }
            const { id } = e.target.closest('li').dataset;
            if (e.target.className === 'todo__btn-remove') {
                this.model.remove(Number(id));
                this.view.removeFromList(Number(id));
            }
            if (e.target.className === 'todo__checkbox') {
                this.model.toggleComplete(Number(id));
                this.view.showCompletedNote(Number(id));
            }
            if (e.target.className === 'todo__btn-change') {
                this.view.showFormToChange(id);
            }
            if (e.target.className === 'todo__btn-apply') {
                const text = this.list.querySelector(`.todo__item[data-id='${id}'] .todo__change-input`).value;
                if (text.trim()) {
                    this.model.update(id, text);
                    this.view.applyChange(id, text);
                }
            }
            if (e.target.className === 'todo__btn-undo') {
                this.view.undoChange(id);
            }
        });
    }
}

const todo = new TodoListControler();
todo.model.token = '';