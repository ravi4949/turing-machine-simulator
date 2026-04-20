const MACHINES = require('./_lib/machinesRegistry');
const runMachine = require('./_lib/simulator');

export default function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { machineId, input, customDef } = req.body;
  if (!machineId) return res.status(400).json({ error: 'machineId required' });
  if (machineId !== 'custom' && !MACHINES[machineId]) return res.status(400).json({ error: 'Unknown machine: ' + machineId });
  if (input === undefined || input === null) return res.status(400).json({ error: 'input required' });
  if (input.length > 0 && !/^[01]+$/.test(input)) return res.status(400).json({ error: 'Input must contain only 0 and 1' });
  if (input.length > 200) return res.status(400).json({ error: 'Input too long (max 200)' });

  try {
    const result = runMachine(input, machineId, customDef);
    res.status(200).json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
