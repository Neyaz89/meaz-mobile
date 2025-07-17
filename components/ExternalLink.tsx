import { type ComponentProps } from 'react';
import { Linking, Platform, Text } from 'react-native';

type Props = ComponentProps<typeof Text> & { href: string };

export function ExternalLink({ href, ...rest }: Props) {
  return (
    <Text
      {...rest}
      style={[rest.style, { color: '#1B95E0', textDecorationLine: 'underline' }]}
      onPress={async (event: any) => {
        if (Platform.OS !== 'web') {
          event.preventDefault && event.preventDefault();
          await Linking.openURL(href);
        }
      }}
    >
      {rest.children || href}
    </Text>
  );
}
