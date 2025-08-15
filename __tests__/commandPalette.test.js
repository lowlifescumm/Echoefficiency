global.bootstrap = {
    Modal: class {
        constructor(el) {
            this.el = el;
        }
        show() {
            this.el.classList.add('show');
        }
        hide() {
            this.el.classList.remove('show');
        }
    }
};
const CommandPalette = require('../public/js/commandPalette');

describe('CommandPalette', () => {
    let commandPalette;
    let commands;

    beforeEach(() => {
        document.body.innerHTML = `
            <div id="command-palette" class="modal" tabindex="-1">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <input type="text" id="command-palette-input" class="form-control" placeholder="Type a command...">
                        </div>
                        <div class="modal-body">
                            <ul id="command-palette-results" class="list-group">
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        `;
        commands = [
            { name: 'Command 1', action: jest.fn() },
            { name: 'Command 2', action: jest.fn() },
            { name: 'Another Command', action: jest.fn() },
        ];
        commandPalette = new CommandPalette(commands);
    });

    test('should open and close the command palette', () => {
        commandPalette.toggle();
        expect(commandPalette.palette.classList.contains('show')).toBe(true);
        commandPalette.toggle();
        expect(commandPalette.palette.classList.contains('show')).toBe(false);
    });

    test('should filter commands based on input', () => {
        commandPalette.input.value = 'command';
        commandPalette.filterCommands();
        const results = commandPalette.results.querySelectorAll('li');
        expect(results.length).toBe(3);
    });

    test('should execute a command when clicked', () => {
        commandPalette.input.value = 'Command 1';
        commandPalette.filterCommands();
        const results = commandPalette.results.querySelectorAll('li');
        results[0].click();
        expect(commands[0].action).toHaveBeenCalled();
    });
});
