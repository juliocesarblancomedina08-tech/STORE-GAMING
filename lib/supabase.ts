import  {  createClient  }  from  "@supabase/supabase-js" ;

const  supabaseUrl  =  process . env . NEXT_PUBLIC_SUPABASE_URL ;
const  superbasePublishableKey  =
proceso . env . NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ;

si  ( ! supabaseUrl )  {
lanzar  nuevo  Error (
"Falta NEXT_PUBLIC_SUPABASE_URL en las variables de entorno".
) ;
}

si  ( ! supabasePublishableKey )  {
lanzar  nuevo  Error (
"Falta NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY en las variables de entorno".
) ;
}

export  const  supabase  =  createClient (
supabaseUrl ,
supabasePublishableKey ,
{
autenticación : {
persistSession : verdadero ,
autoRefreshToken : verdadero ,
detectSessionInUrl : verdadero ,
} ,
}
