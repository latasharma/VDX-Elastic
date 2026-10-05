import React, { useEffect, useRef, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView, ScrollView, View, Text, Pressable, StyleSheet, useWindowDimensions, Modal, Platform, AccessibilityInfo, findNodeHandle } from 'react-native';
import { createRun, advanceRun, approveRun, cancelRun, RunNode, NodeStatus } from '../../packages/run-model/src';

const ink = '#191322', muted = '#70677D', green = '#713BFF';
const labels: Record<NodeStatus, string> = {pending:'Waiting',running:'Running',awaiting_approval:'Needs your approval',succeeded:'Completed',failed:'Failed',cancelled:'Cancelled'};
const symbols: Record<NodeStatus,string> = {pending:'○',running:'◉',awaiting_approval:'!',succeeded:'✓',failed:'×',cancelled:'−'};
export default function App() {
  const [run,setRun] = useState(()=>createRun());
  const [started,setStarted] = useState(false);
  const [screen,setScreen] = useState<'home'|'run'>('home');
  const [tab,setTab] = useState<'tree'|'steps'>('tree');
  const [selected,setSelected] = useState<RunNode['id']>('intent');
  const {width} = useWindowDimensions();
  const wide = width > 850;
  const approvalHeading = useRef<Text>(null);
  const nativeApprovalModal = !wide && Platform.OS !== 'web';
  const awaitingApproval = run.status === 'awaiting_approval';
  const approve = () => setRun(r => r.status === 'awaiting_approval' && r.sync === 'current' ? approveRun(r) : r);
  const cancel = () => setRun(r => ['active', 'awaiting_approval'].includes(r.status) && r.sync === 'current' ? cancelRun(r) : r);
  useEffect(()=>{
    if(!started || run.status !== 'active' || run.sync !== 'current') return;
    const timer = setTimeout(()=>setRun(r=>advanceRun(r)),750);
    return ()=>clearTimeout(timer);
  },[run,started]);
  const chosen = run.nodes.find(n=>n.id===selected)!;
  const finished = ['completed','cancelled','failed'].includes(run.status);
  const status = !started ? 'Ready to explore' : run.status === 'awaiting_approval' ? 'Waiting for your approval' : run.status === 'completed' ? 'Simulation complete' : run.status === 'cancelled' ? 'Run cancelled' : run.status === 'failed' ? 'Run failed' : run.sync === 'gap' ? 'Waiting for missing events' : 'Working through your request';
  useEffect(() => {
    // Android uses the live region below; iOS needs an explicit announcement.
    if (Platform.OS === 'ios' && started && !(awaitingApproval && nativeApprovalModal)) {
      AccessibilityInfo.announceForAccessibility(status);
    }
  }, [status, started, awaitingApproval, nativeApprovalModal]);
  const reset = ()=>{setStarted(false);setRun(createRun(`demo-${Date.now()}`));setSelected('intent');};
  const button = (title:string,onPress:()=>void,secondary=false,disabled=false)=><Pressable accessibilityRole="button" accessibilityState={{disabled}} disabled={disabled} onPress={onPress} style={({pressed})=>[styles.button,secondary&&styles.secondary,disabled&&{opacity:.4},pressed&&{opacity:.75}]}><Text style={[styles.buttonText,secondary&&{color:ink}]}>{title}</Text></Pressable>;
  const card = (node:RunNode,index:number)=><Pressable key={node.id} accessibilityRole="button" accessibilityLabel={`${index+1}. ${node.label}. ${labels[node.status]}. ${run.edges.filter(e=>e.target===node.id).map(e=>'Depends on '+run.nodes.find(n=>n.id===e.source)?.label+'.').join(' ')} Show details.`} accessibilityState={{selected:selected===node.id}} onPress={()=>setSelected(node.id)} style={[styles.node,node.status==='succeeded'&&{backgroundColor:'#E6FF8A'},node.status==='awaiting_approval'&&{backgroundColor:'#FFE5A3'},selected===node.id&&styles.nodeSelected]}><View style={[styles.nodeIcon,node.status==='succeeded'&&{backgroundColor:'#D5F777'},node.status==='awaiting_approval'&&{backgroundColor:'#FFF0C8'}]}><Text style={styles.symbol}>{symbols[node.status]}</Text></View><View style={{flex:1}}><Text style={styles.nodeTitle}>{node.label}</Text><Text style={styles.small}>{labels[node.status]}</Text></View><Text style={styles.ordinal}>{String(index+1).padStart(2,'0')}</Text></Pressable>;
  const approvalPanel = <View style={styles.approval}>
    <Text style={styles.eyebrow}>YOU DECIDE</Text>
    <Text ref={approvalHeading} accessible accessibilityRole="header" style={styles.sectionTitle}>Prepare this demo call?</Text>
    <Text style={styles.body}>Papa · fictional contact ending 1234. Approving continues the simulation only. No call will be placed.</Text>
    {button('Approve simulation', approve, false, run.sync !== 'current')}
    {button('Cancel instead', cancel, true, run.sync !== 'current')}
  </View>;
  return <SafeAreaView style={styles.safe}><StatusBar style="dark"/><ScrollView contentContainerStyle={styles.page}>
    <View style={styles.header}><View><Text style={styles.brand}>elastic<Text style={{color:green}}> / </Text><Text style={styles.brandSub}>VDX</Text></Text><Text style={styles.small}>Your intent. Every step, visible.</Text></View><View style={styles.badge}><Text style={styles.badgeText}>DEVELOPMENT PREVIEW</Text></View></View>
    {screen==='home'&&<View style={styles.hero}><Text style={styles.eyebrow}>YOUR PERSONAL ASSISTANT</Text><Text accessibilityRole="header" style={[styles.title,{fontSize:wide?64:48,lineHeight:wide?68:52}]}>Make room{'\n'}for more.</Text><Text style={styles.subtitle}>Speak it. See it happen.</Text>
      <View style={styles.quickActions}>{['Call','Message','Remember'].map((item,i)=><View key={item} style={[styles.quickAction,{backgroundColor:['#DDC9FF','#E6FF8A','#EEE6FF'][i]}]}><Text style={styles.quickTitle}>{item}</Text><Text style={styles.small}>{i===0?'Try the demo':'Coming soon'}</Text></View>)}</View>
      <Text style={styles.sectionTitle}>Explore your first run</Text><Text style={styles.body}>Prepare a call to Papa and follow every step, including your approval.</Text>
      {button('Try the call demo →',()=>{setScreen('run');setStarted(true);})}
      <Text style={[styles.small,{marginTop:16}]}>Voice input and real device actions are coming later.</Text>
    </View>}
    <View style={styles.notice}><Text style={styles.noticeTitle}>Simulation mode</Text><Text style={styles.noticeText}>This preview uses a fictional contact. No microphone, contacts, phone calls or external services are accessed.</Text></View>
    {screen==='run'&&<View style={[styles.workspace,wide&&{flexDirection:'row'}]}>
      <View style={[styles.main,wide&&{flex:1.55}]}>
        <View style={styles.panelHeader}><View><Text style={styles.eyebrow}>DEMO REQUEST</Text><Text style={styles.request}>“Prepare a call to Papa”</Text></View><Text style={styles.chip}>call.prepare</Text></View>
        <View style={styles.runBar}><Text accessibilityLiveRegion="polite" style={styles.runStatus}>{status}</Text><Text style={styles.small}>{run.nodes.filter(n=>n.status==='succeeded').length} / 5 steps</Text></View>
        {awaitingApproval && !wide && !nativeApprovalModal && <View style={styles.inlineApproval}>{approvalPanel}</View>}
        <View style={styles.tabs}>{(['tree','steps'] as const).map(t=><Pressable key={t} accessibilityRole="tab" accessibilityState={{selected:tab===t}} onPress={()=>setTab(t)} style={[styles.tab,tab===t&&styles.tabActive]}><Text style={[styles.tabText,tab===t&&{color:ink}]}>{t==='tree'?'Node tree':'Accessible steps'}</Text></Pressable>)}</View>
        <View style={styles.graph}>{run.nodes.map((node,i)=><View key={node.id}>{card(node,i)}{tab==='tree'&&run.edges.some(e=>e.source===node.id)&&<View accessible={false} style={styles.edge}><View style={styles.line}/><Text style={styles.arrow}>▼</Text></View>}{tab==='steps'&&i<run.nodes.length-1&&<View style={{height:12}}/>}</View>)}</View>
        <View style={styles.controls}>{!started?button('Run simulation',()=>setStarted(true)):finished?button('Start a new demo',reset):button('Cancel run',cancel,true,run.sync !== 'current')}</View>
      </View>
      <View style={[styles.sidebar,wide&&{flex:1}]}>
        {awaitingApproval && wide && approvalPanel}
        <View style={styles.detail}><Text style={styles.eyebrow}>STEP DETAILS</Text><Text accessibilityRole="header" style={styles.sectionTitle}>{chosen.label}</Text><Text style={styles.detailLabel}>CAPABILITY</Text><Text selectable style={styles.code}>{chosen.capability}</Text><Text style={styles.detailLabel}>EXECUTION LOCATION</Text><Text style={styles.body}>Local simulator · no connected device</Text><Text style={styles.detailLabel}>STATUS</Text><Text style={styles.body}>{labels[chosen.status]}</Text><Text style={styles.detailLabel}>EVIDENCE</Text><Text style={styles.body}>{chosen.id==='evidence'&&run.evidence.length ? run.evidence[0].statement : 'No real-device evidence. Status changes in this preview are generated by the simulator.'}</Text></View>
        <View style={styles.detail}><Text style={styles.eyebrow}>EVENT HISTORY</Text><Text style={styles.body}>An ordered record of this demo run.</Text>{run.events.length===0?<Text style={styles.small}>Start the simulation to see events.</Text>:run.events.slice(-6).map(e=><View key={e.sequence} style={styles.event}><Text style={styles.eventNumber}>{String(e.sequence).padStart(2,'0')}</Text><View style={{flex:1}}><Text style={styles.eventTitle}>{e.type}</Text><Text style={styles.small}>{e.nodeId}</Text></View></View>)}</View>
        <Text style={styles.footer}>Expo mobile app · iOS + Android{ '\n'}Real device execution is not connected yet.</Text>
      </View>
    </View>}
  </ScrollView>
  <View style={styles.bottomNav}>{(['home','run'] as const).map(destination=><Pressable key={destination} accessibilityRole="tab" accessibilityState={{selected:screen===destination}} onPress={()=>setScreen(destination)} style={[styles.navItem,screen===destination&&{backgroundColor:'#EEE6FF'}]}><Text style={{color:screen===destination?green:muted,fontWeight:'700'}}>{destination==='home'?'Home':'Your run'}</Text></Pressable>)}</View>
    <Modal visible={nativeApprovalModal && awaitingApproval} transparent animationType="fade" onRequestClose={cancel} onShow={() => {
      const heading = findNodeHandle(approvalHeading.current);
      if (heading) AccessibilityInfo.setAccessibilityFocus(heading);
      AccessibilityInfo.announceForAccessibility('Approval needed. Prepare a simulated call to Papa, fictional contact ending 1234. No call will be placed. Choose Approve simulation or Cancel instead.');
    }}>
      <SafeAreaView style={styles.modalBackdrop}>
        <ScrollView contentContainerStyle={styles.modalContent} accessibilityViewIsModal>
          {nativeApprovalModal && awaitingApproval && approvalPanel}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  </SafeAreaView>;
}
const styles=StyleSheet.create({
 quickActions:{flexDirection:'row',gap:10,marginTop:28,marginBottom:32},quickAction:{flex:1,padding:14,borderRadius:22,minHeight:104,justifyContent:'space-between'},quickTitle:{fontSize:17,fontWeight:'700',color:ink},bottomNav:{flexDirection:'row',paddingHorizontal:24,paddingVertical:12,gap:12,borderTopWidth:1,borderColor:'#EAE4F2',backgroundColor:'#FCFAFF'},navItem:{flex:1,minHeight:48,borderRadius:24,alignItems:'center',justifyContent:'center'},
 inlineApproval:{padding:16},modalBackdrop:{flex:1,backgroundColor:'rgba(15,35,30,0.55)'},modalContent:{flexGrow:1,justifyContent:'center',padding:20},safe:{flex:1,backgroundColor:'#FCFAFF'},page:{padding:24,paddingBottom:48,maxWidth:1220,width:'100%',alignSelf:'center'},header:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:10,flexWrap:'wrap'},brand:{fontSize:30,fontWeight:'800',color:ink,letterSpacing:-1},brandSub:{fontSize:18,fontWeight:'500'},small:{fontSize:13,color:muted,lineHeight:20},badge:{backgroundColor:'#EEE6FF',paddingHorizontal:12,paddingVertical:8,borderRadius:20},badgeText:{color:ink,fontSize:10,fontWeight:'700',letterSpacing:1},hero:{paddingTop:44,paddingBottom:28},eyebrow:{fontSize:10,letterSpacing:1.5,fontWeight:'800',color:green,marginBottom:10},title:{color:ink,fontWeight:'700',letterSpacing:-1.2,lineHeight:49},subtitle:{color:muted,fontSize:16,lineHeight:25,marginTop:14},notice:{padding:16,backgroundColor:'#FFF5DD',borderRadius:12,marginBottom:24,borderWidth:1,borderColor:'#EFDFB6'},noticeTitle:{fontWeight:'700',color:'#715323',marginBottom:4},noticeText:{color:'#715323',fontSize:13,lineHeight:20},workspace:{gap:22,alignItems:'stretch'},main:{backgroundColor:'#FFFFFF',borderRadius:20,borderWidth:1,borderColor:'#EAE4F2',overflow:'hidden'},panelHeader:{padding:24,gap:10},request:{fontSize:22,color:ink,fontWeight:'600'},chip:{color:muted,fontSize:12},runBar:{backgroundColor:'#F1EBFF',paddingHorizontal:24,paddingVertical:13,flexDirection:'row',justifyContent:'space-between',gap:8,flexWrap:'wrap'},runStatus:{fontWeight:'600',fontSize:13,color:ink},tabs:{flexDirection:'row',flexWrap:'wrap',paddingHorizontal:24,paddingTop:20,gap:20},tab:{paddingBottom:10,borderBottomWidth:2,borderColor:'transparent',minHeight:44},tabActive:{borderColor:green},tabText:{fontSize:14,color:muted,fontWeight:'600'},graph:{padding:24},node:{padding:16,minHeight:83,borderWidth:1,borderColor:'#E5DDF0',borderRadius:13,flexDirection:'row',gap:14,alignItems:'center',backgroundColor:'#F7F4FA'},nodeSelected:{borderColor:green,backgroundColor:'#F0E8FF',borderWidth:2},nodeIcon:{width:36,height:36,borderRadius:11,backgroundColor:'#E9DFFF',alignItems:'center',justifyContent:'center'},symbol:{fontSize:21,color:ink,fontWeight:'600'},nodeTitle:{fontSize:15,fontWeight:'600',color:ink,marginBottom:4},ordinal:{fontSize:12,color:muted},edge:{height:29,alignItems:'center'},line:{width:2,height:21,backgroundColor:'#9164FF'},arrow:{fontSize:10,lineHeight:10,color:'#713BFF',marginTop:-2},controls:{padding:24,paddingTop:0},button:{backgroundColor:green,padding:15,borderRadius:24,minHeight:52,alignItems:'center',marginTop:10},secondary:{backgroundColor:'#F2ECFA',borderWidth:1,borderColor:'#E5DDF0'},buttonText:{color:'white',fontWeight:'700',fontSize:14},sidebar:{gap:18},detail:{padding:24,borderRadius:18,backgroundColor:'#FFFFFF',borderWidth:1,borderColor:'#EAE4F2'},sectionTitle:{fontSize:21,fontWeight:'600',color:ink,marginBottom:10},body:{color:muted,fontSize:14,lineHeight:23,marginBottom:8},detailLabel:{color:muted,fontSize:10,fontWeight:'700',letterSpacing:1,marginTop:16,marginBottom:7},code:{color:ink,fontSize:14},approval:{padding:24,borderRadius:18,backgroundColor:'#FFF5DD',borderWidth:1,borderColor:'#EFDFB6'},event:{flexDirection:'row',gap:12,borderTopWidth:1,borderColor:'#EEE8F4',paddingVertical:10},eventNumber:{fontSize:12,color:green,paddingTop:3},eventTitle:{fontSize:12,fontWeight:'600',color:ink},footer:{fontSize:12,lineHeight:20,color:muted,paddingHorizontal:8}
});
