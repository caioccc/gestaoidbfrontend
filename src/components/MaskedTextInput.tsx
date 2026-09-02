import React from 'react';
import { TextInput, TextInputProps } from '@mantine/core';
import { IMaskInput } from 'react-imask';

export interface MaskedTextInputProps extends TextInputProps {
  mask: string;
  onAccept?: (value: string) => void;
}

export default function MaskedTextInput({
  mask,
  onAccept,
  ...rest
}: MaskedTextInputProps) {
  return (
    <TextInput
      component={IMaskInput}
      {...rest}
      {...({ mask, onAccept } as any)}
    />
  );
}
