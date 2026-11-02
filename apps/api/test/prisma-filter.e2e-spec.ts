import { ArgumentsHost } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaExceptionFilter } from '../src/common/prisma-exception.filter';

describe('GH-08 Prisma exception response privacy', () => {
  const filter = new PrismaExceptionFilter();

  it.each([
    ['P2002', 409],
    ['P2003', 400],
    ['P2014', 409],
    ['P2025', 404],
    ['P2028', 500],
  ])('sanitizes %s with safe HTTP status %i', (code, expected) => {
    let result: unknown;
    const reply = {
      code: jest.fn().mockReturnThis(),
      send: jest.fn((body: unknown) => { result = body; }),
    };
    const host = { switchToHttp: () => ({ getResponse: () => reply }) } as unknown as ArgumentsHost;
    const err = new Prisma.PrismaClientKnownRequestError('private_table.private_column', {
      code, clientVersion: '5.22.0', meta: { target: ['private_column'], constraint: 'private_fk' },
    });
    filter.catch(err, host);
    expect(reply.code).toHaveBeenCalledWith(expected);
    expect(result).toMatchObject({ statusCode: expected, message: expect.any(String) });
    const serialized = JSON.stringify(result);
    expect(serialized).not.toMatch(/private_table|private_column|private_fk|P20\d\d/);
  });
});
