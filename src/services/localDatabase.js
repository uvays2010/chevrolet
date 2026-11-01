/**
 * Browser-local demo data layer. Replace the adapter with a real API adapter
 * when a server and database are provisioned. This is persistence, not security.
 */
const PREFIX = 'chevrolet-universe:v1:';

export const readCollection = (name, fallback = []) => {
  try {
    const raw = localStorage.getItem(`${PREFIX}${name}`);
    return raw ? JSON.parse(raw) : JSON.parse(JSON.stringify(fallback));
  } catch {
    return JSON.parse(JSON.stringify(fallback));
  }
};

export const writeCollection = (name, records) => {
  localStorage.setItem(`${PREFIX}${name}`, JSON.stringify(records));
  return records;
};

export const createRecord = (name, record, fallback = []) => {
  const records = readCollection(name, fallback);
  const next = [{ ...record, id: record.id ?? `${name}-${Date.now()}`, createdAt: new Date().toISOString() }, ...records];
  writeCollection(name, next);
  return next;
};

export const updateRecord = (name, id, patch, fallback = []) => {
  const next = readCollection(name, fallback).map(item => item.id === id ? { ...item, ...patch, updatedAt: new Date().toISOString() } : item);
  writeCollection(name, next);
  return next;
};

export const deleteRecord = (name, id, fallback = []) => {
  const next = readCollection(name, fallback).filter(item => item.id !== id);
  writeCollection(name, next);
  return next;
};

export const exportCollections = names => Object.fromEntries(names.map(name => [name, readCollection(name)]));
