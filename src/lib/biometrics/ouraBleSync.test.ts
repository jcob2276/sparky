import { beforeEach, describe, expect, it } from 'vitest';
import {
  getSavedOuraDevice,
  saveOuraDevice,
} from './ouraBleSync';

describe('Oura BLE saved-device validation', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('invalidates addresses saved by the legacy false-positive detector', () => {
    localStorage.setItem('vanguard_oura_device_address', '49:1E:18:A1:2A:26');
    localStorage.setItem('vanguard_oura_device_name', 'Oura Ring');

    expect(getSavedOuraDevice()).toBeNull();
    expect(localStorage.getItem('vanguard_oura_device_address')).toBeNull();
  });

  it('keeps an address saved after verified Oura selection', () => {
    saveOuraDevice('AA:BB:CC:DD:EE:FF', 'Oura Ring Gen3');

    expect(getSavedOuraDevice()).toEqual({
      address: 'AA:BB:CC:DD:EE:FF',
      name: 'Oura Ring Gen3',
    });
  });
});
