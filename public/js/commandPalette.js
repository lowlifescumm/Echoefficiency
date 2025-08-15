class CommandPalette {
    constructor(commands) {
        this.commands = commands;
        this.palette = document.getElementById('command-palette');
        this.input = document.getElementById('command-palette-input');
        this.results = document.getElementById('command-palette-results');
        this.modal = new bootstrap.Modal(this.palette);

        this.input.addEventListener('input', () => this.filterCommands());
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                this.toggle();
            }
        });
    }

    toggle() {
        if (this.palette.classList.contains('show')) {
            this.modal.hide();
        } else {
            this.modal.show();
            this.input.focus();
        }
    }

    filterCommands() {
        const query = this.input.value.toLowerCase();
        this.results.innerHTML = '';
        const filteredCommands = this.commands.filter(command => command.name.toLowerCase().includes(query));
        filteredCommands.forEach(command => {
            const li = document.createElement('li');
            li.className = 'list-group-item';
            li.textContent = command.name;
            li.addEventListener('click', () => {
                command.action();
                this.modal.hide();
            });
            this.results.appendChild(li);
        });
    }
}

module.exports = CommandPalette;
