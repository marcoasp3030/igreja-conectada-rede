import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createUser() {
  const email = "marcoasp.r@outlook.com";
  const password = "password_placeholder_for_script"; // This will be replaced by the value in the next step
  const fullName = "Marco ASP";

  console.log(`Creating user: ${email}`);

  const { data: userData, error: signUpError } = await supabase.auth.admin.createUser({
    email,
    password: process.argv[2] || password,
    email_confirm: true,
    user_metadata: { full_name: fullName }
  });

  if (signUpError) {
    if (signUpError.message.includes("already registered")) {
        console.log("User already exists, proceeding to role assignment.");
        // Try to find the user
        const { data: users, error: listError } = await supabase.auth.admin.listUsers();
        const user = users?.users.find(u => u.email === email);
        if (user) {
            await assignRole(user.id);
        } else {
            console.error("Could not find user even though they are registered.");
        }
    } else {
        console.error("Error creating user:", signUpError.message);
    }
    return;
  }

  if (userData?.user) {
    console.log("User created successfully:", userData.user.id);
    await assignRole(userData.user.id);
  }
}

async function assignRole(userId: string) {
  console.log(`Assigning admin_sede role to user: ${userId}`);
  
  // Try to insert role into user_roles
  const { error: roleError } = await supabase
    .from('user_roles')
    .upsert({ user_id: userId, role: 'admin_sede' }, { onConflict: 'user_id' });

  if (roleError) {
    console.error("Error assigning role:", roleError.message);
  } else {
    console.log("Role assigned successfully!");
  }
}

createUser();
