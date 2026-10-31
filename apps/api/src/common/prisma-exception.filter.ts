import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { FastifyReply } from 'fastify';

// Never expose Prisma metadata, SQL/column names, or constraint identifiers to clients.
@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter<Prisma.PrismaClientKnownRequestError> {
  catch(error: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost): void {
    const reply = host.switchToHttp().getResponse<FastifyReply>();
    const cases: Record<string, { status: number; message: string }> = {
      P2002: { status: HttpStatus.CONFLICT, message: 'A record with these values already exists.' },
      P2003: { status: HttpStatus.CONFLICT, message: 'The requested change conflicts with an existing reference.' },
      P2014: { status: HttpStatus.CONFLICT, message: 'The requested change conflicts with an existing relationship.' },
      P2025: { status: HttpStatus.NOT_FOUND, message: 'The requested record was not found.' },
    };
    const safe = cases[error.code] ?? { status: HttpStatus.INTERNAL_SERVER_ERROR, message: 'A database operation failed.' };
    const name = safe.status === 404 ? 'Not Found' : safe.status === 409 ? 'Conflict' : 'Internal Server Error';
    reply.code(safe.status).send({ statusCode: safe.status, error: name, message: safe.message });
  }
}
