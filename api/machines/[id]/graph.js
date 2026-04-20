const MACHINES = require('../../_lib/machinesRegistry');

export default function handler(req, res) {
  const { id } = req.query;
  const m = MACHINES[id];
  if (!m) return res.status(404).json({ error: 'Machine not found' });
  res.status(200).json(m.machine.getGraphDefinition());
}
