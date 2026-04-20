const MACHINES = require('../_lib/machinesRegistry');

export default function handler(req, res) {
  const list = Object.values(MACHINES).map(m => ({
    id: m.id, name: m.name, description: m.description,
    inputHint: m.inputHint, examples: m.examples,
  }));
  res.status(200).json({ machines: list });
}
