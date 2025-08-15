class AutosaveManager {
    constructor(surveyId, baseVersion) {
        this.surveyId = surveyId;
        this.baseVersion = baseVersion;
        this.ops = [];
        this.timer = null;
        this.start();
    }

    addOp(op) {
        this.ops.push(op);
    }

    start() {
        this.timer = setInterval(() => this.sendOps(), 5000);
    }

    stop() {
        clearInterval(this.timer);
    }

    async sendOps() {
        if (this.ops.length === 0) {
            return;
        }

        const opsToSend = [...this.ops];
        const idempotencyKey = crypto.randomUUID();

        try {
            const response = await fetch(`/api/surveys/${this.surveyId}/diff`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'idempotency_key': idempotencyKey,
                },
                body: JSON.stringify({
                    base_version: this.baseVersion,
                    ops: opsToSend,
                }),
            });

            if (response.ok) {
                this.ops = this.ops.slice(opsToSend.length);
                this.baseVersion = new Date().toISOString();
            }
        } catch (error) {
            console.error('Error sending diffs:', error);
        }
    }
}

module.exports = AutosaveManager;
