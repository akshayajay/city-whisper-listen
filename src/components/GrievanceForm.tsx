
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

const GrievanceForm: React.FC = () => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    content: '',
    category: '',
    area: '',
    district: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCategoryChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      category: value
    }));
  };

  const handleDistrictChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      district: value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // In a real application, we would submit this data to an API
    console.log('Submitting grievance:', formData);
    
    toast({
      title: "Grievance Submitted",
      description: "Your grievance has been submitted to Tamil Nadu authorities.",
    });
    
    // Reset form and close dialog
    setFormData({
      content: '',
      category: '',
      area: '',
      district: '',
    });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-city-blue hover:bg-blue-700">Submit Grievance</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Submit a New Grievance in Tamil Nadu</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="content">Description</Label>
            <Textarea
              id="content"
              name="content"
              placeholder="Describe the issue or complaint..."
              value={formData.content}
              onChange={handleChange}
              className="min-h-[100px]"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select 
              value={formData.category} 
              onValueChange={handleCategoryChange}
              required
            >
              <SelectTrigger id="category">
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="infrastructure">Infrastructure</SelectItem>
                <SelectItem value="waste">Waste Management</SelectItem>
                <SelectItem value="noise">Noise</SelectItem>
                <SelectItem value="safety">Safety</SelectItem>
                <SelectItem value="transportation">Transportation</SelectItem>
                <SelectItem value="water">Water Supply</SelectItem>
                <SelectItem value="electricity">Electricity</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="district">District</Label>
            <Select 
              value={formData.district} 
              onValueChange={handleDistrictChange}
              required
            >
              <SelectTrigger id="district">
                <SelectValue placeholder="Select district" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="chennai">Chennai</SelectItem>
                <SelectItem value="coimbatore">Coimbatore</SelectItem>
                <SelectItem value="madurai">Madurai</SelectItem>
                <SelectItem value="trichy">Tiruchirappalli</SelectItem>
                <SelectItem value="salem">Salem</SelectItem>
                <SelectItem value="tirunelveli">Tirunelveli</SelectItem>
                <SelectItem value="vellore">Vellore</SelectItem>
                <SelectItem value="thanjavur">Thanjavur</SelectItem>
                <SelectItem value="kanchipuram">Kanchipuram</SelectItem>
                <SelectItem value="erode">Erode</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="area">Area/Neighborhood</Label>
            <Input
              id="area"
              name="area"
              placeholder="Enter the specific area or neighborhood"
              value={formData.area}
              onChange={handleChange}
              required
            />
          </div>
          
          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" className="bg-city-teal hover:bg-teal-700">
              Submit
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default GrievanceForm;
