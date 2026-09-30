import { createClient } from '@supabase/supabase-js'

const supabase = createClient('https://bvyohhxrlijqjejviucc.supabase.co', 'sb_publishable_GbVoPU8tG9bBZCxkDFlI0A_KbiBPeac')

async function testCRUD() {
  console.log('Testing authentication...');
  const email = 'test_crud_' + Date.now() + '@example.com';
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password: 'password123'
  });
  
  if (authError) {
    console.error('Auth error:', authError.message);
    return;
  }
  
  const userId = authData.user.id;
  console.log('User created:', userId);
  
  console.log('Testing Task Creation...');
  const { data: insertData, error: insertError } = await supabase
    .from('tasks')
    .insert([
      { title: 'Test Task', status: 'pending', priority: 'high', assigned_to: userId }
    ])
    .select();
    
  if (insertError) {
    console.error('Insert error:', insertError.message);
    return;
  }
  
  const taskId = insertData[0].id;
  console.log('Task created:', taskId);
  
  console.log('Testing Task Update...');
  const { data: updateData, error: updateError } = await supabase
    .from('tasks')
    .update({ status: 'completed' })
    .eq('id', taskId)
    .select();
    
  if (updateError) {
    console.error('Update error:', updateError.message);
    return;
  }
  console.log('Task updated:', updateData[0].status);
  
  console.log('Testing Task Deletion...');
  const { error: deleteError } = await supabase
    .from('tasks')
    .delete()
    .eq('id', taskId);
    
  if (deleteError) {
    console.error('Delete error:', deleteError.message);
    return;
  }
  console.log('Task deleted successfully!');
  
  console.log('Testing Learning Logs Insert (should fail if columns are missing)...');
  const { error: logError } = await supabase
    .from('learning_logs')
    .insert([
      { title: 'Test Log', category: 'Frontend', duration_minutes: 60, member_id: userId }
    ]);
    
  if (logError) {
    console.error('Learning Log insert error:', logError.message);
  } else {
    console.log('Learning Log inserted successfully!');
  }
}

testCRUD();
