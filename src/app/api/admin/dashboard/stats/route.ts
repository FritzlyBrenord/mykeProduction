import { NextRequest, NextResponse } from 'next/server';
import {  supabaseAdmin  } from '@/lib/supabase-admin';

export async function GET(request: NextRequest) {
  try {
    // Get total revenue
    const { data: orders, error: ordersError } = await supabaseAdmin
      .from('commandes')
      .select('total_amount')
      .eq('status', 'paid');
    
    if (ordersError) throw ordersError;
    
    const totalRevenue = orders?.reduce((acc, order) => acc + (order.total_amount || 0), 0) || 0;
    
    // Get total orders
    const { count: totalOrders, error: ordersCountError } = await supabaseAdmin
      .from('commandes')
      .select('*', { count: 'exact', head: true });
    
    if (ordersCountError) throw ordersCountError;
    
    // Get total enrollments
    const { count: totalEnrollments, error: enrollmentsError } = await supabaseAdmin
      .from('enrollments')
      .select('*', { count: 'exact', head: true });
    
    if (enrollmentsError) throw enrollmentsError;
    
    // Get total users
    const { count: totalUsers, error: usersError } = await supabaseAdmin
      .from('profiles')
      .select('*', { count: 'exact', head: true });
    
    if (usersError) throw usersError;
    
    // Get recent orders
    const { data: recentOrders, error: recentOrdersError } = await supabaseAdmin
      .from('commandes')
      .select('*, user:profiles(full_name, email)')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (recentOrdersError) throw recentOrdersError;
    
    // Get top formations
    const { data: topFormations, error: formationsError } = await supabaseAdmin
      .from('formations')
      .select('*')
      .order('enrolled_count', { ascending: false })
      .limit(5);
    
    if (formationsError) throw formationsError;
    
    return NextResponse.json({
      totalRevenue,
      totalOrders: totalOrders || 0,
      totalEnrollments: totalEnrollments || 0,
      totalUsers: totalUsers || 0,
      recentOrders: recentOrders || [],
      topFormations: topFormations || [],
    });
  } catch (error: any) {
    console.error('Dashboard stats error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard stats' },
      { status: 500 }
    );
  }
}
