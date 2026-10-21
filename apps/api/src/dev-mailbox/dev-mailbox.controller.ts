import { Controller, Get, NotFoundException, Req } from '@nestjs/common';
import { Public, TbRequest } from '../auth/access';
import { DevMailboxService } from './dev-mailbox.service';

const LOOPBACK = new Set(['127.0.0.1', '::1']);

@Controller('dev/mailbox')
export class DevMailboxController {
  constructor(private readonly mailbox: DevMailboxService) {}

  @Get()
  @Public()
  list(@Req() req: TbRequest) {
    if (!this.mailbox.enabled || !LOOPBACK.has(req.clientIp)) throw new NotFoundException();
    return { messages: this.mailbox.list() };
  }
}
