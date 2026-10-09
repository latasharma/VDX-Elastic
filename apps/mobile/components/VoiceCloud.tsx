import React from 'react';
import { Image, Pressable, Text, View } from 'react-native';

/** Original brand artwork, preserved without recoloring or effects. */
export function VoiceCloud({ listening, pending, disabled, onPress }: {
 listening:boolean; pending:boolean; disabled:boolean; onPress:()=>void;
}) {
 const label=pending?'One moment…':listening?'Listening…':'Tap to speak';
 return <Pressable accessibilityRole="button" accessibilityLabel={listening?'Stop listening':label} accessibilityState={{disabled:disabled||pending}} disabled={disabled||pending} onPress={onPress} style={{alignItems:'center',width:'100%',maxWidth:320,paddingVertical:12}}>
 <Image accessible={false} source={require('../../../assets/brand/brand-source-0.png')} style={{width:260,height:260}} resizeMode="contain"/>
 <View style={{paddingVertical:16}}><Text style={{fontSize:22,lineHeight:30,color:disabled?'#B8ADC9':'#F5F1FA',fontWeight:'600'}}>{label}</Text></View>
 </Pressable>;
}
