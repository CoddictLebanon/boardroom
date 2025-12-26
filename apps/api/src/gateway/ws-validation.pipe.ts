import { PipeTransform, Injectable, ArgumentMetadata, Logger } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';

@Injectable()
export class WsValidationPipe implements PipeTransform {
  private readonly logger = new Logger(WsValidationPipe.name);

  async transform(value: any, metadata: ArgumentMetadata) {
    this.logger.log(`WsValidationPipe: type=${metadata.type}, metatype=${metadata.metatype?.name}, value=${JSON.stringify(value)}`);

    // Skip validation for non-body arguments
    if (metadata.type !== 'body') {
      return value;
    }

    // Skip if no metatype
    const { metatype } = metadata;
    if (!metatype || !this.toValidate(metatype)) {
      return value;
    }

    // Transform plain object to class instance
    const object = plainToInstance(metatype, value);

    // Validate
    const errors = await validate(object, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    if (errors.length > 0) {
      const messages = errors
        .map((error) => {
          const constraints = error.constraints || {};
          return Object.values(constraints).join(', ');
        })
        .join('; ');

      this.logger.error(`Validation failed: ${messages}`);
      throw new WsException(`Validation failed: ${messages}`);
    }

    this.logger.log(`Validation passed for ${metatype.name}`);

    return object;
  }

  private toValidate(metatype: any): boolean {
    const types = [String, Boolean, Number, Array, Object];
    return !types.includes(metatype);
  }
}
