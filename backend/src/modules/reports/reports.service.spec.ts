import { ReportsService } from './reports.service';
describe('ReportsService CSV', () => {
  it('escapes commas and quotes', () => { const service = new ReportsService({} as never); expect(service.toCsv({ columns: [{ key: 'name', label: 'Name' }], rows: [{ name: 'Clinic, "A"' }] })).toBe('"Name"\r\n"Clinic, ""A"""'); });
});
