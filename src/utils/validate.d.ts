// src/utils/validate.d.ts
declare module "@/utils/validate" {
  /**
   * Validate `data` against `schema`.
   * @param schema - JSON schema to validate against.
   * @param data - Arbitrary user payload.
   * @param variationAspects - Optional array of aspect names or paths that should be treated as having variations:true.
   * @returns Validation result with validity status and errors.
   */
  export function validate(
    schema: any,
    data: any,
    variationAspects?: string[]
  ): {
    valid: boolean;
    errors: Array<{
      path: string;
      message: string;
      title?: string;
      severity?: string;
      code?: string;
      category?: string;
      schemaPath?: string;
      actualValue?: any;
      expectedValue?: any;
      attributeNames?: string[];
    }>;
  };
}
