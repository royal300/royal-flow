import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { GlassCard, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { accountService, settingsService, PendingExpense } from '@/lib/storage';
import { Trash2, Pencil, ChevronUp, ChevronDown, Check, X } from 'lucide-react';
import Autocomplete from '@/components/Autocomplete';

const StaffExpensePage = () => {
  const { session } = useAuth();
  const { toast } = useToast();

  const [pendingExpenses, setPendingExpenses] = useState<PendingExpense[]>([]);
  const [allSubmittedExpenses, setAllSubmittedExpenses] = useState<PendingExpense[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [banks, setBanks] = useState<string[]>([]);
  const [clients, setClients] = useState<string[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<string[]>([]);

  // Expense Form State
  const [showExpenseForm, setShowExpenseForm] = useState(true);
  const [expenseForm, setExpenseForm] = useState({
    date: '',
    category: '',
    bank: '',
    clientName: '',
    paymentMethod: '',
    amount: '',
    remarks: '',
    rfNo: '',
    isGst: false
  });

  // Inline Editing State
  const [editingExpense, setEditingExpense] = useState<PendingExpense | null>(null);

  useEffect(() => {
    fetchData();
  }, [session?.userId]);

  const fetchData = async () => {
    try {
      const currentStaffId = session?.userId || (session as any)?.id;
      const currentStaffName = (session?.name || '').trim().toLowerCase();

      const [pendingData, approvedData, categoriesSetting, banksSetting, clientsSetting, methodsSetting, allExpenses] = await Promise.all([
        (currentStaffId || currentStaffName) ? accountService.getPendingExpenses(currentStaffId, currentStaffName) : accountService.getPendingExpenses(),
        (currentStaffId || currentStaffName) ? accountService.getExpenses(currentStaffId, currentStaffName) : accountService.getExpenses(),
        settingsService.get('accountCategories'),
        settingsService.get('accountBanks'),
        settingsService.get('accountClients'),
        settingsService.get('accountPaymentMethods'),
        accountService.getExpenses()
      ]);

      const myPending = (pendingData || []).filter(p => {
        if (!currentStaffId && !currentStaffName) return false;
        if (p.staffId && p.staffId === currentStaffId) return true;
        if (p.staffName && p.staffName.trim().toLowerCase() === currentStaffName) return true;
        return false;
      });

      const myApproved = (approvedData || []).filter(a => {
        if (!currentStaffId && !currentStaffName) return false;
        if (a.staffId && a.staffId === currentStaffId) return true;
        if (a.staffName && a.staffName.trim().toLowerCase() === currentStaffName) return true;
        return false;
      });

      const pendingList = myPending.map(p => ({ ...p, status: p.status || 'Pending' }));
      const approvedList = myApproved.map(a => ({ ...a, status: a.status || 'Approved' }));
      const combined = [...pendingList, ...approvedList].sort((a, b) => b.date.localeCompare(a.date));

      setPendingExpenses(pendingList);
      setAllSubmittedExpenses(combined);
      
      const masterCats = Array.isArray(categoriesSetting?.value) ? categoriesSetting.value : [];
      const expCats = Array.from(new Set(allExpenses.map(e => e.category).filter(Boolean) as string[]));
      setCategories(Array.from(new Set(['Meta Ad', ...masterCats, ...expCats])));

      const masterBanks = Array.isArray(banksSetting?.value) ? banksSetting.value : [];
      const expBanks = Array.from(new Set(allExpenses.map(e => e.bank).filter(Boolean) as string[]));
      setBanks(Array.from(new Set([...masterBanks, ...expBanks])));

      const masterClients = Array.isArray(clientsSetting?.value) ? clientsSetting.value : [];
      const expClients = Array.from(new Set(allExpenses.map(e => e.clientName).filter(Boolean) as string[]));
      setClients(Array.from(new Set([...masterClients, ...expClients])));

      const masterMethods = Array.isArray(methodsSetting?.value) ? methodsSetting.value : [];
      const expMethods = Array.from(new Set(allExpenses.map(e => e.paymentMethod).filter(Boolean) as string[]));
      setPaymentMethods(Array.from(new Set([...masterMethods, ...expMethods])));
    } catch (error) {
      console.error("Error loading staff expense data:", error);
      toast({ title: "Failed to load expense data", variant: "destructive" });
    }
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseForm.date || !expenseForm.category || !expenseForm.amount) {
      toast({ title: 'Please fill Date, Category, and Amount', variant: 'destructive' });
      return;
    }
    const dateObj = new Date(expenseForm.date);
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const month = monthNames[dateObj.getMonth()];
    const year = dateObj.getFullYear().toString();

    const amountVal = Number(expenseForm.amount);
    const withoutGstVal = expenseForm.isGst ? Number((amountVal / 1.18).toFixed(2)) : amountVal;
    const gstVal = expenseForm.isGst ? Number((amountVal - withoutGstVal).toFixed(2)) : 0;

    try {
      await accountService.createPendingExpense({
        staffId: session?.userId || (session as any)?.id || '',
        staffName: session?.name || 'Staff Member',
        date: expenseForm.date,
        category: expenseForm.category,
        bank: expenseForm.bank || undefined,
        clientName: expenseForm.clientName || undefined,
        paymentMethod: expenseForm.paymentMethod || undefined,
        rfNo: expenseForm.rfNo || undefined,
        amount: amountVal,
        isGst: expenseForm.isGst,
        gstAmount: gstVal,
        withoutGstAmount: withoutGstVal,
        month,
        year,
        remarks: expenseForm.remarks || undefined
      });

      toast({ title: 'Expense submitted for admin approval successfully' });
      setExpenseForm({ date: '', category: '', bank: '', clientName: '', paymentMethod: '', amount: '', remarks: '', rfNo: '', isGst: false });
      fetchData();
    } catch (error) {
      console.error('Error adding expense:', error);
      toast({ title: 'Failed to submit expense', variant: 'destructive' });
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if (!confirm('Are you sure you want to delete this pending expense?')) return;
    try {
      await accountService.deletePendingExpense(id);
      toast({ title: 'Pending expense deleted successfully' });
      fetchData();
    } catch (error) {
      toast({ title: 'Failed to delete expense', variant: 'destructive' });
    }
  };

  const handleUpdateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingExpense) return;

    try {
      const amountVal = Number(editingExpense.amount);
      const withoutGstVal = editingExpense.isGst ? Number((amountVal / 1.18).toFixed(2)) : amountVal;
      const gstVal = editingExpense.isGst ? Number((amountVal - withoutGstVal).toFixed(2)) : 0;

      const dateObj = new Date(editingExpense.date);
      const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
      const month = !isNaN(dateObj.getMonth()) ? monthNames[dateObj.getMonth()] : editingExpense.month;
      const year = !isNaN(dateObj.getFullYear()) ? dateObj.getFullYear().toString() : editingExpense.year;

      await accountService.updatePendingExpense(editingExpense.id, {
        ...editingExpense,
        amount: amountVal,
        withoutGstAmount: withoutGstVal,
        gstAmount: gstVal,
        month,
        year
      });

      toast({ title: 'Pending expense updated successfully' });
      setEditingExpense(null);
      fetchData();
    } catch (error) {
      toast({ title: 'Failed to update expense', variant: 'destructive' });
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return dateStr;
  };

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Expense Management</h1>
          <p className="text-sm text-muted-foreground">Submit and track your expense records waiting for admin approval.</p>
        </div>
      </div>

      <GlassCard>
        <CardHeader className="flex flex-row items-center justify-between cursor-pointer" onClick={() => setShowExpenseForm(!showExpenseForm)}>
          <div>
            <CardTitle>Submit New Expense</CardTitle>
            <CardDescription>Fill in the expense details below</CardDescription>
          </div>
          <Button variant="ghost" size="sm" className="p-0 h-8 w-8 hover:bg-transparent">
            {showExpenseForm ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
          </Button>
        </CardHeader>
        {showExpenseForm && (
          <CardContent>
            <form onSubmit={handleAddExpense} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div className="space-y-2">
                <Label>Date</Label>
                <Input type="date" className="[&::-webkit-calendar-picker-indicator]:block" value={expenseForm.date} onChange={e => setExpenseForm({ ...expenseForm, date: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Client Name</Label>
                <Autocomplete
                  value={expenseForm.clientName}
                  onChange={v => setExpenseForm({ ...expenseForm, clientName: v })}
                  suggestions={clients}
                  placeholder="Type client name..."
                />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Autocomplete
                  value={expenseForm.category}
                  onChange={v => setExpenseForm({ ...expenseForm, category: v })}
                  suggestions={categories}
                  placeholder="Type category..."
                />
              </div>
              <div className="space-y-2">
                <Label>Payment Mode</Label>
                <Autocomplete
                  value={expenseForm.paymentMethod}
                  onChange={v => setExpenseForm({ ...expenseForm, paymentMethod: v })}
                  suggestions={paymentMethods}
                  placeholder="Type payment mode..."
                />
              </div>
              <div className="space-y-2">
                <Label>Bank</Label>
                <Autocomplete
                  value={expenseForm.bank}
                  onChange={v => setExpenseForm({ ...expenseForm, bank: v })}
                  suggestions={banks}
                  placeholder="Type bank..."
                />
              </div>
              <div className="space-y-2">
                <Label>Ref No.</Label>
                <Input value={expenseForm.rfNo} onChange={e => setExpenseForm({ ...expenseForm, rfNo: e.target.value })} placeholder="Optional" />
              </div>
              <div className="space-y-2">
                <Label>Amount</Label>
                <Input type="number" step="0.01" value={expenseForm.amount} onChange={e => setExpenseForm({ ...expenseForm, amount: e.target.value })} required placeholder="0.00" />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Remarks</Label>
                <Input value={expenseForm.remarks} onChange={e => setExpenseForm({ ...expenseForm, remarks: e.target.value })} placeholder="Optional" />
              </div>
              <div className="flex items-center space-x-2 py-2">
                <Checkbox
                  id="staff-expense-gst"
                  checked={expenseForm.isGst}
                  onCheckedChange={(checked) => setExpenseForm({ ...expenseForm, isGst: checked === true })}
                />
                <Label htmlFor="staff-expense-gst" className="font-medium cursor-pointer">GST (18% Included)</Label>
              </div>
              {expenseForm.isGst && (
                <>
                  <div className="space-y-2">
                    <Label>Without GST Amount</Label>
                    <Input
                      type="text"
                      readOnly
                      value={expenseForm.amount ? (Number(expenseForm.amount) / 1.18).toFixed(2) : '0.00'}
                      className="bg-muted text-muted-foreground font-semibold"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>GST Amount (18%)</Label>
                    <Input
                      type="text"
                      readOnly
                      value={expenseForm.amount ? (Number(expenseForm.amount) - Number(expenseForm.amount) / 1.18).toFixed(2) : '0.00'}
                      className="bg-muted text-muted-foreground font-semibold"
                    />
                  </div>
                </>
              )}
              <div className={expenseForm.isGst ? "md:col-span-1" : "md:col-span-1 md:col-start-4"}>
                <Button type="submit" variant="destructive" className="w-full">Submit Expense</Button>
              </div>
            </form>
          </CardContent>
        )}
      </GlassCard>

      <GlassCard>
        <CardHeader>
          <CardTitle>My Submitted Expenses ({allSubmittedExpenses.length})</CardTitle>
          <CardDescription>View all your submitted expense records. Pending records can be edited until approved by admin.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Client Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Payment Mode</TableHead>
                  <TableHead>Bank</TableHead>
                  <TableHead>Ref No.</TableHead>
                  <TableHead>Remarks</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>GST</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allSubmittedExpenses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                      No expenses found. Submit your first expense using the form above.
                    </TableCell>
                  </TableRow>
                ) : (
                  allSubmittedExpenses.map(item => {
                    const isEditing = editingExpense?.id === item.id;
                    const isApproved = item.status === 'Approved';
                    return (
                      <TableRow key={item.id} className={isApproved ? "bg-muted/30" : ""}>
                        <TableCell>
                          {isEditing ? (
                            <Input
                              type="date"
                              className="[&::-webkit-calendar-picker-indicator]:block w-[140px] text-xs h-8"
                              value={editingExpense.date}
                              onChange={e => setEditingExpense({ ...editingExpense, date: e.target.value })}
                            />
                          ) : formatDate(item.date)}
                        </TableCell>
                        <TableCell>
                          {isEditing ? (
                            <Autocomplete
                              value={editingExpense.clientName || ''}
                              onChange={v => setEditingExpense({ ...editingExpense, clientName: v })}
                              suggestions={clients}
                              placeholder="Client..."
                              className="w-[150px]"
                            />
                          ) : (item.clientName || '-')}
                        </TableCell>
                        <TableCell className="font-medium">
                          {isEditing ? (
                            <Autocomplete
                              value={editingExpense.category}
                              onChange={v => setEditingExpense({ ...editingExpense, category: v })}
                              suggestions={categories}
                              placeholder="Category..."
                              className="w-[150px]"
                            />
                          ) : item.category}
                        </TableCell>
                        <TableCell>
                          {isEditing ? (
                            <Autocomplete
                              value={editingExpense.paymentMethod || ''}
                              onChange={v => setEditingExpense({ ...editingExpense, paymentMethod: v })}
                              suggestions={paymentMethods}
                              placeholder="Mode..."
                              className="w-[140px]"
                            />
                          ) : (item.paymentMethod || '-')}
                        </TableCell>
                        <TableCell>
                          {isEditing ? (
                            <Autocomplete
                              value={editingExpense.bank || ''}
                              onChange={v => setEditingExpense({ ...editingExpense, bank: v })}
                              suggestions={banks}
                              placeholder="Bank..."
                              className="w-[140px]"
                            />
                          ) : (item.bank || '-')}
                        </TableCell>
                        <TableCell>
                          {isEditing ? (
                            <Input
                              className="w-[110px] text-xs h-8"
                              value={editingExpense.rfNo || ''}
                              onChange={e => setEditingExpense({ ...editingExpense, rfNo: e.target.value })}
                            />
                          ) : (item.rfNo || '-')}
                        </TableCell>
                        <TableCell>
                          {isEditing ? (
                            <Input
                              className="w-[160px] text-xs h-8"
                              value={editingExpense.remarks || ''}
                              onChange={e => setEditingExpense({ ...editingExpense, remarks: e.target.value })}
                            />
                          ) : (item.remarks || '-')}
                        </TableCell>
                        <TableCell className="font-semibold text-destructive">
                          {isEditing ? (
                            <Input
                              type="number"
                              step="0.01"
                              className="w-[110px] text-xs h-8"
                              value={editingExpense.amount}
                              onChange={e => setEditingExpense({ ...editingExpense, amount: Number(e.target.value) || 0 })}
                            />
                          ) : `₹${item.amount.toLocaleString()}`}
                        </TableCell>
                        <TableCell>
                          {isEditing ? (
                            <div className="flex items-center gap-1">
                              <Checkbox
                                id={`edit-gst-${item.id}`}
                                checked={editingExpense.isGst}
                                onCheckedChange={(checked) => setEditingExpense({ ...editingExpense, isGst: checked === true })}
                              />
                              <Label htmlFor={`edit-gst-${item.id}`} className="text-xs">GST</Label>
                            </div>
                          ) : (item.isGst && item.gstAmount ? `₹${item.gstAmount}` : '-')}
                        </TableCell>
                        <TableCell>
                          {isApproved ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                              Approved
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                              Pending Approval
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {isEditing ? (
                            <div className="flex justify-end gap-1">
                              <Button size="sm" variant="ghost" onClick={handleUpdateExpense} className="h-8 w-8 p-0 text-success hover:text-success/80">
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => setEditingExpense(null)} className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground">
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : isApproved ? (
                            <span className="text-xs text-muted-foreground italic px-2">Approved</span>
                          ) : (
                            <div className="flex justify-end gap-1">
                              <Button size="sm" variant="ghost" onClick={() => setEditingExpense({ ...item })} className="h-8 w-8 p-0 text-muted-foreground hover:text-primary" title="Edit pending record">
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => handleDeleteExpense(item.id)} className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive" title="Delete pending record">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </GlassCard>
    </div>
  );
};

export default StaffExpensePage;
