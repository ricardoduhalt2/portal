"use client";

import { useState, ChangeEvent, FormEvent } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import Head from 'next/head';
import { useRouter } from 'next/navigation'; // For redirect if not authenticated
import Image from 'next/image'; // For image previews

interface FilePreview {
  file: File;
  previewUrl: string;
}

export default function SubmitActivityPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const router = useRouter();

  // Plastic Mitigation States
  const [mitigatedPlasticKg, setMitigatedPlasticKg] = useState<string>('');
  const [imageFiles, setImageFiles] = useState<FilePreview[]>([]);
  const [mitigationLoading, setMitigationLoading] = useState(false);
  const [mitigationMessage, setMitigationMessage] = useState('');
  const [mitigationError, setMitigationError] = useState('');

  // Petgas Consumption States
  const [litersConsumed, setLitersConsumed] = useState<string>('');
  // const [transactionDate, setTransactionDate] = useState<string>(new Date().toISOString().split('T')[0]); // Default to today
  const [consumptionLoading, setConsumptionLoading] = useState(false);
  const [consumptionMessage, setConsumptionMessage] = useState('');
  const [consumptionError, setConsumptionError] = useState('');


  // Redirect if not authenticated (though ClientLayout should also handle this)
  if (!authLoading && !user) {
    if (typeof window !== 'undefined') router.replace('/login');
    return null;
  }

  const handleImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const filesArray = Array.from(event.target.files);
      const newFilePreviews = filesArray.map(file => ({
        file,
        previewUrl: URL.createObjectURL(file),
      }));
      setImageFiles(prev => [...prev, ...newFilePreviews]);
    }
    // Clear the input value to allow selecting the same file again if removed
    event.target.value = '';
  };

  const removeImage = (index: number) => {
    const fileToRemove = imageFiles[index];
    URL.revokeObjectURL(fileToRemove.previewUrl); // Clean up object URL
    setImageFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmitPlasticMitigation = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user || !profile) {
      setMitigationError('You must be logged in to submit data.');
      return;
    }
    if (!mitigatedPlasticKg || parseFloat(mitigatedPlasticKg) <= 0) {
      setMitigationError('Please enter a valid amount for mitigated plastic (kg).');
      return;
    }

    setMitigationLoading(true);
    setMitigationMessage('');
    setMitigationError('');

    try {
      // 1. Upload images
      const uploadedImageUrls: string[] = [];
      if (imageFiles.length > 0) {
        for (const filePreview of imageFiles) {
          const fileName = `${user.id}/${Date.now()}_${filePreview.file.name}`;
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('mitigation-images')
            .upload(fileName, filePreview.file, {
              cacheControl: '3600',
              upsert: false,
            });

          if (uploadError) {
            console.error('Error uploading image:', uploadError);
            throw new Error(`Failed to upload ${filePreview.file.name}: ${uploadError.message}`);
          }
          
          // Get public URL
          const { data: publicUrlData } = supabase.storage
            .from('mitigation-images')
            .getPublicUrl(uploadData.path);
          
          if (!publicUrlData?.publicUrl) {
            throw new Error(`Failed to get public URL for ${filePreview.file.name}.`);
          }
          uploadedImageUrls.push(publicUrlData.publicUrl);
        }
      }

      // 2. Create plastic_mitigation_entries record
      const { data: mitigationEntry, error: entryError } = await supabase
        .from('plastic_mitigation_entries')
        .insert({
          client_id: user.id,
          mitigated_plastic_kg: parseFloat(mitigatedPlasticKg),
        })
        .select()
        .single();

      if (entryError) {
        console.error('Error creating mitigation entry:', entryError);
        // Attempt to delete uploaded images if entry creation fails
        if (uploadedImageUrls.length > 0) {
            const pathsToDelete = uploadedImageUrls.map(url => {
                // Extract path from URL. This is a bit simplistic and might need refinement
                // depending on the exact URL structure Supabase returns and if custom domains are used.
                const parts = url.split('/');
                return parts.slice(parts.indexOf('mitigation-images') + 1).join('/');
            });
            console.log("Attempting to delete uploaded files due to error:", pathsToDelete);
            await supabase.storage.from('mitigation-images').remove(pathsToDelete);
        }
        throw entryError;
      }

      // 3. Create mitigation_activity_images records
      if (uploadedImageUrls.length > 0 && mitigationEntry) {
        const imageRecords = uploadedImageUrls.map(url => ({
          entry_id: mitigationEntry.id,
          image_url: url,
        }));
        const { error: imageRecordError } = await supabase
          .from('mitigation_activity_images')
          .insert(imageRecords);

        if (imageRecordError) {
          console.error('Error creating image records:', imageRecordError);
          // Note: At this point, the mitigation entry exists. Deciding on rollback strategy is complex.
          // For now, we'll report the error. A more robust solution might involve a transaction or cleanup job.
          throw imageRecordError;
        }
      }

      setMitigationMessage('Plastic mitigation activity logged successfully!');
      setMitigatedPlasticKg('');
      setImageFiles([]);
      // Revoke all object URLs for cleanup
      imageFiles.forEach(f => URL.revokeObjectURL(f.previewUrl));

    } catch (err: any) {
      console.error('Mitigation submission error:', err);
      setMitigationError(err.message || 'An unknown error occurred.');
    } finally {
      setMitigationLoading(false);
    }
  };

  const handleSubmitPetgasConsumption = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user || !profile) {
      setConsumptionError('You must be logged in to submit data.');
      return;
    }
     if (!litersConsumed || parseFloat(litersConsumed) <= 0) {
      setConsumptionError('Please enter a valid amount for Petgas consumed (liters).');
      return;
    }

    setConsumptionLoading(true);
    setConsumptionMessage('');
    setConsumptionError('');

    try {
      const { error } = await supabase
        .from('petgas_consumption_entries')
        .insert({
          client_id: user.id,
          liters_consumed: parseFloat(litersConsumed),
          // transaction_date will default to now() in the DB if not provided
          // transaction_date: new Date(transactionDate).toISOString(), 
        });

      if (error) {
        console.error('Error logging Petgas consumption:', error);
        throw error;
      }

      setConsumptionMessage('Petgas consumption logged successfully!');
      setLitersConsumed('');
      // setTransactionDate(new Date().toISOString().split('T')[0]); // Reset date

    } catch (err: any) {
      console.error('Consumption submission error:', err);
      setConsumptionError(err.error_description || err.message || 'Failed to log consumption.');
    } finally {
      setConsumptionLoading(false);
    }
  };
  
  if (authLoading || (!user && !profile)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <p className="text-gray-700">Loading activity submission form...</p>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Submit Activity | Petgas Portal</title>
      </Head>
      {/* Background and padding from ClientLayout */}
      <div className="mx-auto max-w-3xl space-y-12">
          {/* Plastic Mitigation Form */}
          <section className="bg-[var(--petgas-white)] shadow-xl rounded-lg p-8">
            <h2 className="text-xl font-semibold text-[var(--petgas-green-dark)] mb-6">Log Plastic Mitigation</h2>
            <form onSubmit={handleSubmitPlasticMitigation} className="space-y-6">
              <div>
                <label htmlFor="mitigatedPlasticKg" className="block text-sm font-medium text-[var(--text-color)]">
                  Kilograms of Plastic Mitigated for this Activity/Entry
                </label>
                <input
                  type="number"
                  name="mitigatedPlasticKg"
                  id="mitigatedPlasticKg"
                  value={mitigatedPlasticKg}
                  onChange={(e) => setMitigatedPlasticKg(e.target.value)}
                  min="0.01"
                  step="0.01"
                  required
                  className="input-styled mt-1 block w-full p-3"
                  placeholder="e.g., 10.5"
                  disabled={mitigationLoading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-color)]">
                  Upload Image Evidence (Optional)
                </label>
                <div className="mt-1 flex justify-center rounded-md border-2 border-dashed border-[var(--input-border-color)] px-6 pt-5 pb-6 hover:border-[var(--primary-accent)] transition-colors">
                  <div className="space-y-1 text-center">
                    <svg className="mx-auto h-12 w-12 text-[var(--text-color-muted)]" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                      <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <div className="flex text-sm text-[var(--text-color-muted)]">
                      <label
                        htmlFor="file-upload"
                        className="relative cursor-pointer rounded-md bg-transparent font-medium text-[var(--primary-accent)] hover:text-[var(--petgas-blue-primary)] focus-within:outline-none focus-within:ring-2 focus-within:ring-[var(--primary-accent)] focus-within:ring-offset-2"
                      >
                        <span>Upload files</span>
                        <input id="file-upload" name="file-upload" type="file" className="sr-only" multiple onChange={handleImageChange} accept="image/png, image/jpeg, image/jpg" disabled={mitigationLoading} />
                      </label>
                      <p className="pl-1">or drag and drop</p>
                    </div>
                    <p className="text-xs text-[var(--text-color-muted)]">PNG, JPG, JPEG up to 10MB</p>
                  </div>
                </div>
              </div>

              {imageFiles.length > 0 && (
                <div className="mt-4">
                  <h3 className="text-sm font-medium text-[var(--text-color)] mb-2">Selected Images:</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {imageFiles.map((filePreview, index) => (
                      <div key={index} className="relative group">
                        <Image src={filePreview.previewUrl} alt={`Preview ${filePreview.file.name}`} width={100} height={100} className="w-full h-24 object-cover rounded-md" />
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          className="absolute top-1 right-1 bg-red-600 hover:bg-red-700 text-white rounded-full p-1 text-xs opacity-75 group-hover:opacity-100 transition-opacity"
                          disabled={mitigationLoading}
                        >
                          X
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {mitigationMessage && <p className="text-sm text-[var(--petgas-green-primary)] bg-green-100 p-3 rounded-md">{mitigationMessage}</p>}
              {mitigationError && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-md">{mitigationError}</p>}

              <div>
                <button
                  type="submit"
                  disabled={mitigationLoading}
                  className="btn-primary group relative flex w-full justify-center py-3 px-4 text-sm"
                >
                  {mitigationLoading ? (
                     <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                  ) : 'Log Plastic Mitigation'}
                </button>
              </div>
            </form>
          </section>

          {/* Petgas Consumption Form */}
          <section className="bg-[var(--petgas-white)] shadow-xl rounded-lg p-8">
            <h2 className="text-xl font-semibold text-[var(--petgas-green-dark)] mb-6">Log Petgas Consumption</h2>
            <form onSubmit={handleSubmitPetgasConsumption} className="space-y-6">
              <div>
                <label htmlFor="litersConsumed" className="block text-sm font-medium text-[var(--text-color)]">
                  Liters of Petgas Consumed for this Transaction/Event
                </label>
                <input
                  type="number"
                  name="litersConsumed"
                  id="litersConsumed"
                  value={litersConsumed}
                  onChange={(e) => setLitersConsumed(e.target.value)}
                  min="0.01"
                  step="0.01"
                  required
                  className="input-styled mt-1 block w-full p-3"
                  placeholder="e.g., 50.75"
                  disabled={consumptionLoading}
                />
              </div>
              
              {/* Optional: Transaction Date - Defaulting to server's 'now()' currently 
              <div>
                <label htmlFor="transactionDate" className="block text-sm font-medium text-[var(--text-color)]">
                  Transaction Date
                </label>
                <input
                  type="date"
                  name="transactionDate"
                  id="transactionDate"
                  value={transactionDate}
                  onChange={(e) => setTransactionDate(e.target.value)}
                  required
                  className="input-styled mt-1 block w-full p-3"
                  disabled={consumptionLoading}
                />
              </div>
              */}
              
              {consumptionMessage && <p className="text-sm text-[var(--petgas-green-primary)] bg-green-100 p-3 rounded-md">{consumptionMessage}</p>}
              {consumptionError && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-md">{consumptionError}</p>}

              <div>
                <button
                  type="submit"
                  disabled={consumptionLoading}
                  className="btn-primary group relative flex w-full justify-center py-3 px-4 text-sm" // Using btn-primary for this too
                >
                  {consumptionLoading ? (
                     <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                  ) : 'Log Petgas Consumption'}
                </button>
              </div>
            </form>
          </section>
        </div>
      </div>
    </>
  );
}
