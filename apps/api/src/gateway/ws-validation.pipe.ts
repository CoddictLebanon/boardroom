import { PipeTransform, Injectable, ArgumentMetadata } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';

@Injectable()
export class WsValidationPipe implements PipeTransform {
  async transform(value: any, metadata: ArgumentMetadata) {
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

      throw new WsException(`Validation failed: ${messages}`);
    }

    return object;
  }

  private toValidate(metatype: any): boolean {
    const types = [String, Boolean, Number, Array, Object];
    return !types.includes(metatype);
  }
}
