import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { PATH_METADATA, METHOD_METADATA } from '@nestjs/common/constants';
import { RequestMethod } from '@nestjs/common';
import { DiscoveryService, MetadataScanner, Reflector } from '@nestjs/core';
import { ACCESS_KEY, Access } from './access';

export interface RouteInfo {
  route: string;
  method: string;
  access?: Access;
}

// Deny by default: boot fails if any route lacks @Public(), @Authenticated() or @RequirePermission().
@Injectable()
export class RouteAccessVerifier implements OnApplicationBootstrap {
  constructor(
    private readonly discovery: DiscoveryService,
    private readonly scanner: MetadataScanner,
    private readonly reflector: Reflector,
  ) {}

  routes(): RouteInfo[] {
    const out: RouteInfo[] = [];
    for (const wrapper of this.discovery.getControllers()) {
      const proto = wrapper.metatype?.prototype;
      if (!proto) continue;
      const base = Reflect.getMetadata(PATH_METADATA, wrapper.metatype) as string;
      for (const name of this.scanner.getAllMethodNames(proto)) {
        const fn = proto[name];
        const path = Reflect.getMetadata(PATH_METADATA, fn) as string | undefined;
        if (path === undefined) continue;
        out.push({
          route: `/${[base, path].filter((p) => p && p !== '/').join('/')}`,
          method: RequestMethod[Reflect.getMetadata(METHOD_METADATA, fn) as number],
          access: this.reflector.getAllAndOverride<Access | undefined>(ACCESS_KEY, [fn, wrapper.metatype as object as Function]),
        });
      }
    }
    return out;
  }

  onApplicationBootstrap(): void {
    const missing = this.routes().filter((r) => !r.access);
    if (missing.length) {
      throw new Error(`Routes without an access declaration: ${missing.map((r) => `${r.method} ${r.route}`).join(', ')}`);
    }
  }
}
